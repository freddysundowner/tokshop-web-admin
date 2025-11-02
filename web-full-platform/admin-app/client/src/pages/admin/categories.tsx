import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { AdminLayout } from "@/components/admin-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Folder, Search, ChevronLeft, ChevronRight, ChevronRight as ArrowRight, Upload, Trash2, Plus, Edit, Image as ImageIcon, ArrowDownToLine, MoreVertical } from "lucide-react";
import { Label } from "@/components/ui/label";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";

interface Category {
  _id: string;
  name: string;
  icon?: string;
  type?: string;
  followersCount?: number;
  viewersCount?: number;
  subCategories?: any[];
}

export default function AdminCategories() {
  const [page, setPage] = useState(1);
  const [searchTitle, setSearchTitle] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [bulkImportText, setBulkImportText] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [addCategoryDialogOpen, setAddCategoryDialogOpen] = useState(false);
  const [categoryName, setCategoryName] = useState("");
  const [categoryIcon, setCategoryIcon] = useState<File | null>(null);
  const [categoryToDelete, setCategoryToDelete] = useState<string | null>(null);
  const [subcategoryDialogOpen, setSubcategoryDialogOpen] = useState(false);
  const [selectedCategoryForSubcategories, setSelectedCategoryForSubcategories] = useState<{ id: string; name: string } | null>(null);
  const [subcategoryImportText, setSubcategoryImportText] = useState("");
  const [editCategoryDialogOpen, setEditCategoryDialogOpen] = useState(false);
  const [categoryToEdit, setCategoryToEdit] = useState<Category | null>(null);
  const [editCategoryName, setEditCategoryName] = useState("");
  const [editCategoryIcon, setEditCategoryIcon] = useState<File | null>(null);
  const [convertToChildDialogOpen, setConvertToChildDialogOpen] = useState(false);
  const [categoryToConvert, setCategoryToConvert] = useState<Category | null>(null);
  const [selectedParentId, setSelectedParentId] = useState<string>("");
  const { toast } = useToast();
  const limit = 10;

  const buildQueryString = () => {
    const params = new URLSearchParams();
    params.append('limit', limit.toString());
    params.append('page', page.toString());
    if (searchTitle) params.append('title', searchTitle);
    return params.toString();
  };

  const queryString = buildQueryString();
  const { data: categoriesData, isLoading } = useQuery<any>({
    queryKey: ['/api/admin/categories', queryString],
    queryFn: async () => {
      const response = await fetch(`/api/admin/categories?${queryString}`);
      if (!response.ok) throw new Error('Failed to fetch categories');
      return response.json();
    },
  });

  const categories = categoriesData?.data?.categories || [];
  const totalPages = categoriesData?.data?.pages || 1;
  const totalDocs = categoriesData?.data?.totalDoc || 0;
  
  const handleSearch = () => {
    setSearchTitle(searchInput);
    setPage(1);
  };

  const handleClearSearch = () => {
    setSearchInput("");
    setSearchTitle("");
    setPage(1);
  };

  const bulkImportMutation = useMutation({
    mutationFn: async (names: string[]) => {
      return apiRequest("POST", "/api/admin/categories/bulk", { names });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/categories'] });
      toast({
        title: "Success",
        description: "Categories imported successfully",
      });
      setBulkImportText("");
      setIsDialogOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to import categories",
        variant: "destructive",
      });
    },
  });

  const handleBulkImport = () => {
    const names = bulkImportText
      .split('\n')
      .map(name => name.trim())
      .filter(name => name.length > 0);
    
    if (names.length === 0) {
      toast({
        title: "Error",
        description: "Please enter at least one category name",
        variant: "destructive",
      });
      return;
    }

    bulkImportMutation.mutate(names);
  };

  const addCategoryMutation = useMutation({
    mutationFn: async ({ name, icon }: { name: string; icon: File | null }) => {
      console.log('Starting category mutation with name:', name, 'icon:', icon?.name);
      
      const formData = new FormData();
      formData.append('name', name);
      if (icon) {
        formData.append('images', icon);
      }

      console.log('Sending request to /api/admin/categories');
      
      try {
        const response = await fetch('/api/admin/categories', {
          method: 'POST',
          body: formData,
        });

        console.log('Response received:', response.status, response.statusText);

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Failed to add category');
        }

        const data = await response.json();
        console.log('Success data:', data);
        return data;
      } catch (error) {
        console.error('Fetch error:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/categories'] });
      toast({
        title: "Success",
        description: "Category added successfully",
      });
      setCategoryName("");
      setCategoryIcon(null);
      setAddCategoryDialogOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add category",
        variant: "destructive",
      });
    },
  });

  const handleAddCategory = () => {
    if (!categoryName.trim()) {
      toast({
        title: "Error",
        description: "Please enter a category name",
        variant: "destructive",
      });
      return;
    }

    addCategoryMutation.mutate({
      name: categoryName,
      icon: categoryIcon,
    });
  };

  const deleteMutation = useMutation({
    mutationFn: async (categoryId: string) => {
      return apiRequest("DELETE", `/api/admin/categories/${categoryId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/categories'] });
      toast({
        title: "Success",
        description: "Category deleted successfully",
      });
      setCategoryToDelete(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete category",
        variant: "destructive",
      });
    },
  });

  const handleDeleteCategory = () => {
    if (categoryToDelete) {
      deleteMutation.mutate(categoryToDelete);
    }
  };

  const editCategoryMutation = useMutation({
    mutationFn: async ({ id, name, icon }: { id: string; name: string; icon: File | null }) => {
      const formData = new FormData();
      formData.append('name', name);
      if (icon) {
        formData.append('images', icon);
      }

      const response = await fetch(`/api/admin/categories/${id}`, {
        method: 'PUT',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update category');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/categories'] });
      toast({
        title: "Success",
        description: "Category updated successfully",
      });
      setEditCategoryDialogOpen(false);
      setCategoryToEdit(null);
      setEditCategoryName("");
      setEditCategoryIcon(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update category",
        variant: "destructive",
      });
    },
  });

  const handleEditCategory = () => {
    if (!categoryToEdit || !editCategoryName.trim()) {
      toast({
        title: "Error",
        description: "Please enter a category name",
        variant: "destructive",
      });
      return;
    }

    editCategoryMutation.mutate({
      id: categoryToEdit._id,
      name: editCategoryName,
      icon: editCategoryIcon,
    });
  };

  const openEditDialog = (category: Category) => {
    setCategoryToEdit(category);
    setEditCategoryName(category.name);
    setEditCategoryIcon(null);
    setEditCategoryDialogOpen(true);
  };

  const convertToChildMutation = useMutation({
    mutationFn: async ({ categoryId, parentId }: { categoryId: string; parentId: string }) => {
      return apiRequest("PUT", `/api/admin/categories/${categoryId}/convert`, {
        targetType: 'child',
        parentId,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/categories'] });
      toast({
        title: "Success",
        description: "Category converted to subcategory successfully",
      });
      setConvertToChildDialogOpen(false);
      setCategoryToConvert(null);
      setSelectedParentId("");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to convert category",
        variant: "destructive",
      });
    },
  });

  const handleConvertToChild = () => {
    if (!categoryToConvert || !selectedParentId) {
      toast({
        title: "Error",
        description: "Please select a parent category",
        variant: "destructive",
      });
      return;
    }

    if (categoryToConvert._id === selectedParentId) {
      toast({
        title: "Error",
        description: "Cannot convert a category to be its own subcategory",
        variant: "destructive",
      });
      return;
    }

    convertToChildMutation.mutate({
      categoryId: categoryToConvert._id,
      parentId: selectedParentId,
    });
  };

  const subcategoryBulkImportMutation = useMutation({
    mutationFn: async ({ categoryId, names }: { categoryId: string; names: string[] }) => {
      return apiRequest("POST", `/api/admin/categories/${categoryId}/subcategories/bulk`, { names });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/categories'] });
      toast({
        title: "Success",
        description: "Subcategories imported successfully",
      });
      setSubcategoryImportText("");
      setSubcategoryDialogOpen(false);
      setSelectedCategoryForSubcategories(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to import subcategories",
        variant: "destructive",
      });
    },
  });

  const handleBulkImportSubcategories = () => {
    if (!selectedCategoryForSubcategories) return;

    const names = subcategoryImportText
      .split('\n')
      .map(name => name.trim())
      .filter(name => name.length > 0);
    
    if (names.length === 0) {
      toast({
        title: "Error",
        description: "Please enter at least one subcategory name",
        variant: "destructive",
      });
      return;
    }

    subcategoryBulkImportMutation.mutate({
      categoryId: selectedCategoryForSubcategories.id,
      names,
    });
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading categories...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="mb-6">
          <h2 className="text-3xl font-bold text-foreground">Categories</h2>
          <p className="text-muted-foreground">Manage product categories</p>
        </div>

        {/* Search and Bulk Import */}
        <div className="mb-6 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search categories by name..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="pl-10"
              data-testid="input-search-categories"
            />
          </div>
          <div className="flex gap-2">
            <Button onClick={handleSearch} data-testid="button-search">
              Search
            </Button>
            {searchTitle && (
              <Button variant="outline" onClick={handleClearSearch} data-testid="button-clear-search">
                Clear
              </Button>
            )}
            <Dialog open={addCategoryDialogOpen} onOpenChange={setAddCategoryDialogOpen}>
              <DialogTrigger asChild>
                <Button data-testid="button-add-category">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Category
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New Category</DialogTitle>
                  <DialogDescription>
                    Create a new category with an optional icon image.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="category-name">Category Name</Label>
                    <Input
                      id="category-name"
                      placeholder="Enter category name"
                      value={categoryName}
                      onChange={(e) => setCategoryName(e.target.value)}
                      data-testid="input-category-name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="category-icon">Category Icon (Optional)</Label>
                    <Input
                      id="category-icon"
                      type="file"
                      accept="image/*"
                      onChange={(e) => setCategoryIcon(e.target.files?.[0] || null)}
                      data-testid="input-category-icon"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setAddCategoryDialogOpen(false);
                      setCategoryName("");
                      setCategoryIcon(null);
                    }}
                    data-testid="button-cancel-add-category"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleAddCategory}
                    disabled={addCategoryMutation.isPending}
                    data-testid="button-submit-add-category"
                  >
                    {addCategoryMutation.isPending ? "Adding..." : "Add"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" data-testid="button-bulk-import">
                  <Upload className="h-4 w-4 mr-2" />
                  Bulk Import
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Bulk Import Categories</DialogTitle>
                  <DialogDescription>
                    Enter category names, one per line. They will be added to the system.
                  </DialogDescription>
                </DialogHeader>
                <Textarea
                  placeholder="Category 1&#10;Category 2&#10;Category 3"
                  value={bulkImportText}
                  onChange={(e) => setBulkImportText(e.target.value)}
                  className="min-h-[200px]"
                  data-testid="textarea-bulk-import"
                />
                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setIsDialogOpen(false)}
                    data-testid="button-cancel-import"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleBulkImport}
                    disabled={bulkImportMutation.isPending}
                    data-testid="button-submit-import"
                  >
                    {bulkImportMutation.isPending ? "Importing..." : "Import"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Categories Table */}
        <Card>
          <CardHeader>
            <CardTitle>All Categories</CardTitle>
            <CardDescription>Product categories in the platform</CardDescription>
          </CardHeader>
          <CardContent>
            {categories.length === 0 ? (
              <div className="text-center py-12">
                <Folder className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No categories found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">
                        Icon
                      </th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">
                        Name
                      </th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">
                        Type
                      </th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">
                        Subcategories
                      </th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {categories.map((category: Category) => {
                      return (
                        <tr
                          key={category._id}
                          className="border-b border-border hover:bg-muted/50 transition-colors"
                          data-testid={`row-category-${category._id}`}
                        >
                          <td className="py-3 px-4">
                            {category.icon ? (
                              <img
                                src={`https://api.iconaapp.com/${category.icon}`}
                                alt={category.name}
                                className="w-16 h-16 object-cover rounded-md"
                                data-testid={`img-category-${category._id}`}
                              />
                            ) : (
                              <div className="w-16 h-16 bg-muted rounded-md flex items-center justify-center">
                                <Folder className="h-6 w-6 text-muted-foreground" />
                              </div>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            <Link href={`/admin/categories/${category._id}/subcategories`}>
                              <div className="flex items-center gap-2 cursor-pointer group">
                                <span 
                                  className="font-medium text-foreground group-hover:text-primary transition-colors"
                                  data-testid={`text-category-name-${category._id}`}
                                >
                                  {category.name}
                                </span>
                                <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                              </div>
                            </Link>
                          </td>
                          <td className="py-3 px-4">
                            <span className="text-sm text-muted-foreground capitalize">
                              {category.type || 'N/A'}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <span className="text-sm text-muted-foreground">
                              {category.subCategories?.length || 0}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex justify-end">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    data-testid={`button-actions-${category._id}`}
                                  >
                                    <MoreVertical className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem
                                    onClick={() => openEditDialog(category)}
                                    data-testid={`button-edit-category-${category._id}`}
                                  >
                                    <Edit className="h-4 w-4 mr-2" />
                                    Edit
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => {
                                      setSelectedCategoryForSubcategories({ id: category._id, name: category.name });
                                      setSubcategoryDialogOpen(true);
                                    }}
                                    data-testid={`button-add-subcategories-${category._id}`}
                                  >
                                    <Plus className="h-4 w-4 mr-2" />
                                    Add Subcategories
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => {
                                      setCategoryToConvert(category);
                                      setConvertToChildDialogOpen(true);
                                    }}
                                    data-testid={`button-convert-to-child-${category._id}`}
                                  >
                                    <ArrowDownToLine className="h-4 w-4 mr-2" />
                                    Convert to Subcategory
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    onClick={() => setCategoryToDelete(category._id)}
                                    data-testid={`button-delete-category-${category._id}`}
                                    className="text-destructive focus:text-destructive"
                                  >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Delete
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pagination */}
        {categories.length > 0 && (
          <div className="mt-6 flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Page {page} of {totalPages} ({totalDocs} total categories)
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                data-testid="button-prev-page"
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => p + 1)}
                disabled={page >= totalPages}
                data-testid="button-next-page"
              >
                Next
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Convert to Child Dialog */}
      <Dialog open={convertToChildDialogOpen} onOpenChange={(open) => {
        setConvertToChildDialogOpen(open);
        if (!open) {
          setCategoryToConvert(null);
          setSelectedParentId("");
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Convert to Subcategory</DialogTitle>
            <DialogDescription>
              Convert "{categoryToConvert?.name}" to a subcategory by selecting its parent category.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="parent-category">Parent Category</Label>
              <Select value={selectedParentId} onValueChange={setSelectedParentId}>
                <SelectTrigger id="parent-category" data-testid="select-parent-category">
                  <SelectValue placeholder="Select a parent category" />
                </SelectTrigger>
                <SelectContent>
                  {categories
                    .filter((cat: Category) => cat._id !== categoryToConvert?._id)
                    .map((cat: Category) => (
                      <SelectItem key={cat._id} value={cat._id}>
                        {cat.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setConvertToChildDialogOpen(false);
                setCategoryToConvert(null);
                setSelectedParentId("");
              }}
              data-testid="button-cancel-convert"
            >
              Cancel
            </Button>
            <Button
              onClick={handleConvertToChild}
              disabled={convertToChildMutation.isPending}
              data-testid="button-submit-convert"
            >
              {convertToChildMutation.isPending ? "Converting..." : "Convert"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Category Dialog */}
      <Dialog open={editCategoryDialogOpen} onOpenChange={(open) => {
        setEditCategoryDialogOpen(open);
        if (!open) {
          setCategoryToEdit(null);
          setEditCategoryName("");
          setEditCategoryIcon(null);
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Category</DialogTitle>
            <DialogDescription>
              Update the category name and icon.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-category-name">Category Name</Label>
              <Input
                id="edit-category-name"
                placeholder="Enter category name"
                value={editCategoryName}
                onChange={(e) => setEditCategoryName(e.target.value)}
                data-testid="input-edit-category-name"
              />
            </div>
            <div>
              <Label htmlFor="edit-category-icon">Category Icon (Optional)</Label>
              <Input
                id="edit-category-icon"
                type="file"
                accept="image/*"
                onChange={(e) => setEditCategoryIcon(e.target.files?.[0] || null)}
                data-testid="input-edit-category-icon"
              />
              {categoryToEdit?.icon && (
                <div className="mt-2">
                  <p className="text-sm text-muted-foreground mb-1">Current Icon:</p>
                  <img
                    src={`https://api.iconaapp.com/${categoryToEdit.icon}`}
                    alt={categoryToEdit.name}
                    className="w-16 h-16 object-cover rounded-md"
                  />
                </div>
              )}
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setEditCategoryDialogOpen(false);
                setCategoryToEdit(null);
                setEditCategoryName("");
                setEditCategoryIcon(null);
              }}
              data-testid="button-cancel-edit-category"
            >
              Cancel
            </Button>
            <Button
              onClick={handleEditCategory}
              disabled={editCategoryMutation.isPending}
              data-testid="button-submit-edit-category"
            >
              {editCategoryMutation.isPending ? "Updating..." : "Update"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Bulk Import Subcategories Dialog */}
      <Dialog open={subcategoryDialogOpen} onOpenChange={setSubcategoryDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Bulk Import Subcategories</DialogTitle>
            <DialogDescription>
              Add subcategories to {selectedCategoryForSubcategories?.name}. Enter one subcategory name per line.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Subcategory 1&#10;Subcategory 2&#10;Subcategory 3"
            value={subcategoryImportText}
            onChange={(e) => setSubcategoryImportText(e.target.value)}
            className="min-h-[200px]"
            data-testid="textarea-bulk-import-subcategories-from-categories"
          />
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setSubcategoryDialogOpen(false);
                setSubcategoryImportText("");
                setSelectedCategoryForSubcategories(null);
              }}
              data-testid="button-cancel-import-subcategories"
            >
              Cancel
            </Button>
            <Button
              onClick={handleBulkImportSubcategories}
              disabled={subcategoryBulkImportMutation.isPending}
              data-testid="button-submit-import-subcategories"
            >
              {subcategoryBulkImportMutation.isPending ? "Importing..." : "Import"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!categoryToDelete} onOpenChange={(open) => !open && setCategoryToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Category</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this category? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteCategory}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete"
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}
