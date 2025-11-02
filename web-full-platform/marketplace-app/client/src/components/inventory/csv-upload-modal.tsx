import { useState, useCallback, useRef } from "react";
import Papa from "papaparse";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { 
  Upload, 
  Download, 
  FileText, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  X,
  Check,
  Loader2
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";

// Fields that should NOT appear in CSV upload interface
const DISALLOWED_COLUMNS = new Set([
  'category', 'shippingprofile', 'weight', 'width', 'height', 'length', 'scale'
]);

// Normalize header names for comparison (lowercase, remove special chars)
const normalizeHeader = (header: string): string => {
  return header.toLowerCase().replace(/[^a-z0-9]/g, '');
};

interface CSVRow {
  [key: string]: string;
}

interface ParsedProduct {
  name: string;
  description?: string;
  price: number;
  quantity: number;
  listingType?: 'buy_now' | 'auction';
  colors?: string[];
  sizes?: string[];
  featured?: boolean;
  rowIndex: number;
  errors: string[];
  isValid: boolean;
}

interface ColumnMapping {
  [csvColumn: string]: keyof typeof PRODUCT_FIELDS | ''; // Maps CSV column to product field or empty (skip)
}

interface UploadProgress {
  processed: number;
  total: number;
  successful: number;
  failed: number;
  isProcessing: boolean;
}

interface CSVUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const REQUIRED_FIELDS = ['name', 'price', 'quantity'];

// Force rebuild: CSV Upload Product Fields
const PRODUCT_FIELDS = {
  name: { label: 'Product Name', required: true, type: 'text' },
  description: { label: 'Description', required: false, type: 'text' },
  price: { label: 'Price', required: true, type: 'number' },
  quantity: { label: 'Quantity', required: true, type: 'number' },
  listingType: { label: 'Listing Type', required: false, type: 'select', options: ['buy_now', 'auction'] },
  colors: { label: 'Colors (comma-separated)', required: false, type: 'array' },
  sizes: { label: 'Sizes (comma-separated)', required: false, type: 'array' },
  featured: { label: 'Featured', required: false, type: 'boolean' }
} as const;

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const BATCH_SIZE = 10; // Process products in batches

export function CSVUploadModal({ isOpen, onClose, onSuccess }: CSVUploadModalProps) {
  const [currentStep, setCurrentStep] = useState<'upload' | 'mapping' | 'preview' | 'processing' | 'complete'>('upload');
  const [csvData, setCsvData] = useState<CSVRow[]>([]);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [columnMapping, setColumnMapping] = useState<ColumnMapping>({});
  const [parsedProducts, setParsedProducts] = useState<ParsedProduct[]>([]);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress>({
    processed: 0,
    total: 0,
    successful: 0,
    failed: 0,
    isProcessing: false
  });
  const [uploadErrors, setUploadErrors] = useState<Array<{ row: number; error: string; data: any }>>([]);
  const [isDragActive, setIsDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { user } = useAuth();
  const { toast } = useToast();

  const handleReset = () => {
    setCurrentStep('upload');
    setCsvData([]);
    setCsvHeaders([]);
    setColumnMapping({});
    setParsedProducts([]);
    setUploadProgress({ processed: 0, total: 0, successful: 0, failed: 0, isProcessing: false });
    setUploadErrors([]);
    setIsDragActive(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  const downloadTemplate = () => {
    // Only include supported fields - NO weight, height, width, length, scale, category, shippingProfile
    const templateData = [
      {
        name: 'Example Product 1',
        description: 'A great product with excellent features',
        price: '29.99',
        quantity: '100',
        listingType: 'buy_now',
        colors: 'Red, Blue, Black',
        sizes: 'S, M, L, XL',
        featured: 'true'
      },
      {
        name: 'Example Product 2',
        description: 'Another amazing product',
        price: '49.99',
        quantity: '50',
        listingType: 'buy_now',
        colors: 'White, Gray',
        sizes: 'One Size',
        featured: 'false'
      }
    ];

    const csv = Papa.unparse(templateData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'product_upload_template.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const validateFile = (file: File): string | null => {
    if (!file.type.includes('csv') && !file.name.endsWith('.csv')) {
      return 'Please upload a CSV file';
    }
    if (file.size > MAX_FILE_SIZE) {
      return 'File size must be less than 5MB';
    }
    return null;
  };

  const parseCSV = (file: File) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (results.errors.length > 0) {
          toast({
            title: 'CSV Parse Error',
            description: `Errors found in CSV: ${results.errors.map(e => e.message).join(', ')}`,
            variant: 'destructive'
          });
          return;
        }

        if (results.data.length === 0) {
          toast({
            title: 'Empty CSV',
            description: 'The CSV file appears to be empty',
            variant: 'destructive'
          });
          return;
        }

        // Extract headers and filter out disallowed columns
        const allHeaders = Object.keys(results.data[0] as CSVRow);
        const filteredHeaders = allHeaders.filter(header => 
          !DISALLOWED_COLUMNS.has(normalizeHeader(header))
        );
        
        setCsvHeaders(filteredHeaders);
        setCsvData(results.data as CSVRow[]);
        
        // Auto-map columns based on header names (only from filtered headers)
        const autoMapping: ColumnMapping = {};
        filteredHeaders.forEach(header => {
          const normalizedHeader = header.toLowerCase().trim();
          const matchingField = Object.keys(PRODUCT_FIELDS).find(field => 
            field.toLowerCase() === normalizedHeader ||
            PRODUCT_FIELDS[field as keyof typeof PRODUCT_FIELDS].label.toLowerCase() === normalizedHeader
          );
          if (matchingField) {
            autoMapping[header] = matchingField as keyof typeof PRODUCT_FIELDS;
          } else {
            autoMapping[header] = ''; // Default to 'skip'
          }
        });
        setColumnMapping(autoMapping);
        setCurrentStep('mapping');
      },
      error: (error) => {
        toast({
          title: 'CSV Parse Error',
          description: error.message,
          variant: 'destructive'
        });
      }
    });
  };

  const handleFileSelect = (file: File) => {
    const error = validateFile(file);
    if (error) {
      toast({
        title: 'Invalid File',
        description: error,
        variant: 'destructive'
      });
      return;
    }
    parseCSV(file);
  };

  const handleFileInput = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDrop = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    setIsDragActive(false);
    
    const file = event.dataTransfer.files[0];
    if (file) {
      handleFileSelect(file);
    }
  }, []);

  const handleDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    setIsDragActive(true);
  }, []);

  const handleDragLeave = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    setIsDragActive(false);
  }, []);

  const validateAndParseProducts = async () => {
    // Skip cache loading since we no longer validate dynamic fields during CSV upload

    const products: ParsedProduct[] = [];
    
    csvData.forEach((row, index) => {
      const product: ParsedProduct = {
        name: '',
        price: 0,
        quantity: 0,
        rowIndex: index + 1,
        errors: [],
        isValid: true
      };

      // Map CSV data to product fields
      Object.entries(columnMapping).forEach(([csvColumn, productField]) => {
        const value = row[csvColumn]?.trim();
        
        if (productField && value !== undefined) {
          const fieldConfig = PRODUCT_FIELDS[productField as keyof typeof PRODUCT_FIELDS];
          
          if (fieldConfig.required && (!value || value === '')) {
            product.errors.push(`${fieldConfig.label} is required`);
            product.isValid = false;
          } else if (value && value !== '') {
            switch (fieldConfig.type) {
              case 'number':
                const numValue = parseFloat(value);
                if (isNaN(numValue) || numValue < 0) {
                  product.errors.push(`${fieldConfig.label} must be a valid positive number`);
                  product.isValid = false;
                } else {
                  (product as any)[productField] = numValue;
                }
                break;
              case 'select':
                const selectConfig = fieldConfig as any;
                if (selectConfig.options && !selectConfig.options.includes(value)) {
                  product.errors.push(`${fieldConfig.label} must be one of: ${selectConfig.options.join(', ')}`);
                  product.isValid = false;
                } else {
                  (product as any)[productField] = value;
                }
                break;
              case 'array':
                // Split comma-separated values and trim whitespace
                const arrayValue = value.split(',').map(item => item.trim()).filter(item => item);
                (product as any)[productField] = arrayValue;
                break;
              case 'boolean':
                // Convert string to boolean
                const boolValue = value.toLowerCase();
                if (['true', '1', 'yes', 'y'].includes(boolValue)) {
                  (product as any)[productField] = true;
                } else if (['false', '0', 'no', 'n', ''].includes(boolValue)) {
                  (product as any)[productField] = false;
                } else {
                  product.errors.push(`${fieldConfig.label} must be true/false, yes/no, 1/0, or y/n`);
                  product.isValid = false;
                }
                break;
              default:
                (product as any)[productField] = value;
            }
          }
        }
      });

      // Check for required fields
      REQUIRED_FIELDS.forEach(field => {
        if (!Object.values(columnMapping).includes(field as keyof typeof PRODUCT_FIELDS)) {
          product.errors.push(`Required field '${field}' is not mapped`);
          product.isValid = false;
        }
      });

      products.push(product);
    });

    setParsedProducts(products);
    setCurrentStep('preview');
  };





  const processUpload = async () => {
    const validProducts = parsedProducts.filter(p => p.isValid);
    
    if (validProducts.length === 0) {
      toast({
        title: 'No Valid Products',
        description: 'Please fix validation errors before proceeding',
        variant: 'destructive'
      });
      return;
    }

    setCurrentStep('processing');
    setUploadProgress({
      processed: 0,
      total: validProducts.length,
      successful: 0,
      failed: 0,
      isProcessing: true
    });

    const errors: Array<{ row: number; error: string; data: any }> = [];
    let totalSuccessful = 0;

    // Process products in batches of 10
    for (let i = 0; i < validProducts.length; i += BATCH_SIZE) {
      const batch = validProducts.slice(i, i + BATCH_SIZE);
      
      try {
        // Products are already resolved during validation, just prepare the batch
        const productsData = batch.map(product => ({
          name: product.name,
          description: product.description || '',
          price: product.price,
          quantity: product.quantity,
          listingType: product.listingType || 'buy_now',
          status: 'inactive', // Set products as inactive until categories/shipping are assigned
          colors: product.colors || [],
          sizes: product.sizes || [],
          featured: product.featured || false
        }));

        console.log(`Uploading batch ${Math.floor(i / BATCH_SIZE) + 1} with ${productsData.length} products`);

        if (!user?.id) {
          throw new Error('User authentication required');
        }

        const response = await fetch(`/api/products/bulkadd/${user.id}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ products: productsData })
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Failed to upload batch');
        }

        const result = await response.json();
        
        // Update progress based on API response
        const batchSuccessful = result.successful || batch.length;
        const batchFailed = result.failed || 0;
        
        totalSuccessful += batchSuccessful;
        
        // If there were failures in the batch, add them to errors
        if (batchFailed > 0 && result.errors) {
          result.errors.forEach((error: any, index: number) => {
            const productIndex = i + index;
            if (productIndex < batch.length) {
              errors.push({
                row: batch[productIndex].rowIndex,
                error: error.message || 'Failed to create product',
                data: batch[productIndex]
              });
            }
          });
        }

        setUploadProgress(prev => ({
          ...prev,
          processed: prev.processed + batch.length,
          successful: prev.successful + batchSuccessful,
          failed: prev.failed + batchFailed
        }));

      } catch (error: any) {
        console.error('Batch upload error:', error);
        
        // If the entire batch failed, mark all products in the batch as failed
        batch.forEach(product => {
          errors.push({
            row: product.rowIndex,
            error: error.message || 'Batch upload failed',
            data: product
          });
        });
        
        setUploadProgress(prev => ({
          ...prev,
          processed: prev.processed + batch.length,
          failed: prev.failed + batch.length
        }));
      }
    }

    setUploadErrors(errors);
    setUploadProgress(prev => ({ ...prev, isProcessing: false }));
    setCurrentStep('complete');
    
    // Invalidate queries to refresh inventory data
    queryClient.invalidateQueries({ queryKey: ['external-products'] });
    
    toast({
      title: 'Upload Complete',
      description: `${totalSuccessful} products uploaded successfully${errors.length > 0 ? `, ${errors.length} failed` : ''}`,
      variant: totalSuccessful > 0 ? 'default' : 'destructive'
    });
  };

  const downloadErrorReport = () => {
    if (uploadErrors.length === 0) return;

    const errorData = uploadErrors.map(err => ({
      row: err.row,
      error: err.error,
      name: err.data.name,
      price: err.data.price,
      quantity: err.data.quantity
    }));

    const csv = Papa.unparse(errorData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'upload_errors.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const validProductsCount = parsedProducts.filter(p => p.isValid).length;
  const invalidProductsCount = parsedProducts.length - validProductsCount;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto" data-testid="dialog-csv-upload">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2" data-testid="text-csv-upload-title">
            <Upload className="h-5 w-5" />
            Bulk Product Upload
          </DialogTitle>
          <DialogDescription>
            Upload products in bulk using a CSV file. Download our template to get started.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={currentStep} className="w-full">
          <div className="w-full overflow-x-auto pb-2">
            <TabsList className="inline-flex w-full min-w-max sm:w-full sm:min-w-0 sm:grid sm:grid-cols-3 lg:grid-cols-5">
              <TabsTrigger value="upload" disabled={currentStep !== 'upload'} data-testid="tab-upload" className="flex-shrink-0 sm:flex-shrink">
                Upload
              </TabsTrigger>
              <TabsTrigger value="mapping" disabled={currentStep === 'upload'} data-testid="tab-mapping" className="flex-shrink-0 sm:flex-shrink">
                Mapping
              </TabsTrigger>
              <TabsTrigger value="preview" disabled={!['preview', 'processing', 'complete'].includes(currentStep)} data-testid="tab-preview" className="flex-shrink-0 sm:flex-shrink">
                Preview
              </TabsTrigger>
              <TabsTrigger value="processing" disabled={currentStep !== 'processing'} data-testid="tab-processing" className="flex-shrink-0 sm:flex-shrink">
                Processing
              </TabsTrigger>
              <TabsTrigger value="complete" disabled={currentStep !== 'complete'} data-testid="tab-complete" className="flex-shrink-0 sm:flex-shrink">
                Complete
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Step 1: File Upload */}
          <TabsContent value="upload" className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Upload CSV File</h3>
              <Button 
                variant="outline" 
                onClick={downloadTemplate}
                data-testid="button-download-template"
              >
                <Download className="h-4 w-4 mr-2" />
                Download Template
              </Button>
            </div>
            
            <Card>
              <CardContent className="pt-6">
                <div
                  className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                    isDragActive 
                      ? 'border-primary bg-primary/5' 
                      : 'border-muted-foreground/25 hover:border-primary/50'
                  }`}
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  data-testid="drop-zone-csv"
                >
                  <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <h4 className="text-lg font-semibold mb-2">Drop your CSV file here</h4>
                  <p className="text-muted-foreground mb-4">
                    or click to browse your files
                  </p>
                  <Button 
                    onClick={() => fileInputRef.current?.click()}
                    data-testid="button-browse-files"
                  >
                    Browse Files
                  </Button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv"
                    onChange={handleFileInput}
                    className="hidden"
                    data-testid="input-file-csv"
                  />
                  <p className="text-sm text-muted-foreground mt-4">
                    Maximum file size: 5MB. CSV format only.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Step 2: Column Mapping */}
          <TabsContent value="mapping" className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold mb-2">Map CSV Columns to Product Fields</h3>
              <p className="text-muted-foreground">Match your CSV columns to the correct product fields.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {csvHeaders.map((header) => (
                <div key={header} className="space-y-2">
                  <Label>CSV Column: "{header}"</Label>
                  <Select
                    value={columnMapping[header] || 'skip'}
                    onValueChange={(value) => setColumnMapping(prev => ({ 
                      ...prev, 
                      [header]: value === 'skip' ? '' : value as keyof typeof PRODUCT_FIELDS
                    }))}
                    data-testid={`select-mapping-${header}`}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select product field" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="skip">
                        <span className="text-muted-foreground">Skip this column</span>
                      </SelectItem>
                      {Object.entries(PRODUCT_FIELDS).map(([field, config]) => (
                        <SelectItem key={field} value={field}>
                          <div className="flex items-center gap-2">
                            <span>{config.label}</span>
                            {config.required && (
                              <Badge variant="destructive" className="text-xs">Required</Badge>
                            )}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>

            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Make sure to map all required fields: {REQUIRED_FIELDS.join(', ')}
              </AlertDescription>
            </Alert>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setCurrentStep('upload')} data-testid="button-back-to-upload">
                Back
              </Button>
              <Button onClick={validateAndParseProducts} data-testid="button-continue-to-preview">
                Continue to Preview
              </Button>
            </div>
          </TabsContent>

          {/* Step 3: Preview & Validation */}
          <TabsContent value="preview" className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold">Preview & Validate</h3>
                <p className="text-muted-foreground">
                  Review your data before uploading. Fix any validation errors below.
                </p>
              </div>
              <div className="flex gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span>{validProductsCount} Valid</span>
                </div>
                <div className="flex items-center gap-2">
                  <XCircle className="h-4 w-4 text-red-600" />
                  <span>{invalidProductsCount} Invalid</span>
                </div>
              </div>
            </div>

            <div className="max-h-96 overflow-y-auto border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Row</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Errors</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {parsedProducts.map((product) => (
                    <TableRow 
                      key={product.rowIndex} 
                      data-testid={`row-product-${product.rowIndex}`}
                    >
                      <TableCell>{product.rowIndex}</TableCell>
                      <TableCell>
                        {product.isValid ? (
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-600" />
                        )}
                      </TableCell>
                      <TableCell>{product.name || 'N/A'}</TableCell>
                      <TableCell>{product.price > 0 ? `$${product.price}` : 'N/A'}</TableCell>
                      <TableCell>{product.quantity > 0 ? product.quantity : 'N/A'}</TableCell>
                      <TableCell>
                        {product.errors.length > 0 && (
                          <div className="space-y-1">
                            {product.errors.map((error, index) => (
                              <Badge key={index} variant="destructive" className="text-xs block w-fit">
                                {error}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setCurrentStep('mapping')} data-testid="button-back-to-mapping">
                Back to Mapping
              </Button>
              <Button 
                onClick={processUpload} 
                disabled={validProductsCount === 0}
                data-testid="button-start-upload"
              >
                Upload {validProductsCount} Products
              </Button>
            </div>
          </TabsContent>

          {/* Step 4: Processing */}
          <TabsContent value="processing" className="space-y-4">
            <div className="text-center space-y-4">
              <Loader2 className="h-12 w-12 animate-spin mx-auto" />
              <h3 className="text-lg font-semibold">Processing Upload...</h3>
              <p className="text-muted-foreground">
                Uploading products in batches. Please don't close this window.
              </p>
            </div>

            <Card>
              <CardContent className="pt-6">
                <div className="space-y-4">
                  <div className="flex justify-between text-sm">
                    <span>Progress</span>
                    <span>{uploadProgress.processed} / {uploadProgress.total}</span>
                  </div>
                  <Progress 
                    value={(uploadProgress.processed / uploadProgress.total) * 100} 
                    className="w-full"
                    data-testid="progress-upload"
                  />
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span>Successful: {uploadProgress.successful}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <XCircle className="h-4 w-4 text-red-600" />
                      <span>Failed: {uploadProgress.failed}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Step 5: Complete */}
          <TabsContent value="complete" className="space-y-4">
            <div className="text-center space-y-4">
              <CheckCircle className="h-16 w-16 text-green-600 mx-auto" />
              <h3 className="text-xl font-semibold">Upload Complete!</h3>
              <p className="text-muted-foreground">
                Your products have been processed.
              </p>
            </div>

            <Card>
              <CardContent className="pt-6">
                <div className="grid grid-cols-2 gap-4 text-center">
                  <div>
                    <div className="text-2xl font-bold text-green-600">{uploadProgress.successful}</div>
                    <div className="text-sm text-muted-foreground">Successful</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-red-600">{uploadProgress.failed}</div>
                    <div className="text-sm text-muted-foreground">Failed</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {uploadErrors.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-yellow-600" />
                    Upload Errors
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                    {uploadErrors.slice(0, 5).map((error, index) => (
                      <div key={index} className="text-sm text-red-600">
                        Row {error.row}: {error.error}
                      </div>
                    ))}
                    {uploadErrors.length > 5 && (
                      <div className="text-sm text-muted-foreground">
                        ... and {uploadErrors.length - 5} more errors
                      </div>
                    )}
                  </div>
                  <Button 
                    variant="outline" 
                    onClick={downloadErrorReport} 
                    className="mt-4"
                    data-testid="button-download-errors"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download Error Report
                  </Button>
                </CardContent>
              </Card>
            )}

            <div className="flex justify-center gap-4">
              <Button variant="outline" onClick={handleReset} data-testid="button-upload-more">
                Upload More Products
              </Button>
              <Button onClick={() => { onSuccess(); handleClose(); }} data-testid="button-done">
                Done
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}