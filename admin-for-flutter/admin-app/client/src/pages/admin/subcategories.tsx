import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute, useLocation, Link } from "wouter";
import { AdminLayout } from "@/components/admin-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { Folder, ArrowLeft, Upload, Trash2, Plus, ArrowUpFromLine, MoreVertical } from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";

interface SubCategory {
  _id: string;
  name: string;
  icon?: string;
  followersCount?: number;
  viewersCount?: number;
}

interface Category {
  _id: string;
  name: string;
  icon?: string;
  type?: string;
  subCategories?: SubCategory[];
}

export default function AdminSubCategories() {
  const [location] = useLocation();
  const [, params] = useRoute("/admin/categories/:categoryId/subcategories");
  const categoryId = params?.categoryId;
  const [bulkImportText, setBulkImportText] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [addSubcategoryDialogOpen, setAddSubcategoryDialogOpen] = useState(false);
  const [subcategoryName, setSubcategoryName] = useState("");
  const [subcategoryIcon, setSubcategoryIcon] = useState<File | null>(null);
  const [subcategoryToDelete, setSubcategoryToDelete] = useState<string | null>(null);
  const { toast } = useToast();

  const { data: categoryData, isLoading } = useQuery<any>({
    queryKey: ['/api/admin/categories', categoryId],
    queryFn: async () => {
      const response = await fetch(`/api/admin/categories/${categoryId}`);
      if (!response.ok) throw new Error('Failed to fetch category');
      return response.json();
    },
    enabled: !!categoryId,
  });

  const category: Category | undefined = categoryData?.data;
  const subCategories = category?.subCategories || [];

  const bulkImportMutation = useMutation({
    mutationFn: async (names: string[]) => {
      return apiRequest("POST", `/api/admin/categories/${categoryId}/subcategories/bulk`, { names });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/categories', categoryId] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/categories'] });
      toast({
        title: "Success",
        description: "Subcategories imported successfully",
      });
      setBulkImportText("");
      setIsDialogOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to import subcategories",
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
        description: "Please enter at least one subcategory name",
        variant: "destructive",
      });
      return;
    }

    bulkImportMutation.mutate(names);
  };

  const addSubcategoryMutation = useMutation({
    mutationFn: async ({ name, icon, parentId }: { name: string; icon: File | null; parentId: string }) => {
      const formData = new FormData();
      formData.append('name', name);
      formData.append('category', parentId);
      formData.append('type', 'child');
      if (icon) {
        formData.append('images', icon);
      }

      const response = await fetch('/api/admin/subcategories', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to add subcategory');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/categories', categoryId] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/categories'] });
      toast({
        title: "Success",
        description: "Subcategory added successfully",
      });
      setSubcategoryName("");
      setSubcategoryIcon(null);
      setAddSubcategoryDialogOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add subcategory",
        variant: "destructive",
      });
    },
  });

  const handleAddSubcategory = () => {
    if (!subcategoryName.trim()) {
      toast({
        title: "Error",
        description: "Please enter a subcategory name",
        variant: "destructive",
      });
      return;
    }

    if (!categoryId) {
      toast({
        title: "Error",
        description: "Category ID is missing",
        variant: "destructive",
      });
      return;
    }

    addSubcategoryMutation.mutate({
      name: subcategoryName,
      icon: subcategoryIcon,
      parentId: categoryId,
    });
  };

  const deleteMutation = useMutation({
    mutationFn: async (subcategoryId: string) => {
      return apiRequest("DELETE", `/api/admin/subcategories/${subcategoryId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/categories', categoryId] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/categories'] });
      toast({
        title: "Success",
        description: "Subcategory deleted successfully",
      });
      setSubcategoryToDelete(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete subcategory",
        variant: "destructive",
      });
    },
  });

  const handleDeleteSubcategory = () => {
    if (subcategoryToDelete) {
      deleteMutation.mutate(subcategoryToDelete);
    }
  };

  const convertToParentMutation = useMutation({
    mutationFn: async (subcategoryId: string) => {
      return apiRequest("PUT", `/api/admin/categories/${subcategoryId}/convert`, {
        targetType: 'parent',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/categories', categoryId] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/categories'] });
      toast({
        title: "Success",
        description: "Subcategory converted to parent category successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to convert subcategory",
        variant: "destructive",
      });
    },
  });

  const handleConvertToParent = (subcategoryId: string) => {
    convertToParentMutation.mutate(subcategoryId);
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading subcategories...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="p-4 sm:p-6 lg:p-8">
        {/* Header with Back Button */}
        <div className="mb-6">
          <Link href="/admin/categories">
            <Button variant="ghost" size="sm" className="mb-4" data-testid="button-back-to-categories">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Categories
            </Button>
          </Link>
          <div className="flex items-center gap-4">
            {category?.icon ? (
              <img
                src={`https://api.iconaapp.com/${category.icon}`}
                alt={category.name}
                className="w-20 h-20 object-cover rounded-lg"
              />
            ) : (
              <div className="w-20 h-20 bg-muted rounded-lg flex items-center justify-center">
                <Folder className="h-8 w-8 text-muted-foreground" />
              </div>
            )}
            <div>
              <h2 className="text-3xl font-bold text-foreground">{category?.name || 'Category'}</h2>
              <p className="text-muted-foreground">
                {subCategories.length} subcategorie{subCategories.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
        </div>

        {/* Add and Bulk Import Buttons */}
        <div className="mb-6 flex justify-end gap-2">
          <Dialog open={addSubcategoryDialogOpen} onOpenChange={setAddSubcategoryDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-add-subcategory">
                <Plus className="h-4 w-4 mr-2" />
                Add Subcategory
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Subcategory</DialogTitle>
                <DialogDescription>
                  Create a new subcategory under {category?.name} with an optional icon image.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="subcategory-name">Subcategory Name</Label>
                  <Input
                    id="subcategory-name"
                    placeholder="Enter subcategory name"
                    value={subcategoryName}
                    onChange={(e) => setSubcategoryName(e.target.value)}
                    data-testid="input-subcategory-name"
                  />
                </div>
                <div>
                  <Label htmlFor="subcategory-icon">Subcategory Icon (Optional)</Label>
                  <Input
                    id="subcategory-icon"
                    type="file"
                    accept="image/*"
                    onChange={(e) => setSubcategoryIcon(e.target.files?.[0] || null)}
                    data-testid="input-subcategory-icon"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setAddSubcategoryDialogOpen(false);
                    setSubcategoryName("");
                    setSubcategoryIcon(null);
                  }}
                  data-testid="button-cancel-add-subcategory"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleAddSubcategory}
                  disabled={addSubcategoryMutation.isPending}
                  data-testid="button-submit-add-subcategory"
                >
                  {addSubcategoryMutation.isPending ? "Adding..." : "Add"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" data-testid="button-bulk-import-subcategories">
                <Upload className="h-4 w-4 mr-2" />
                Bulk Import Subcategories
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Bulk Import Subcategories</DialogTitle>
                <DialogDescription>
                  Enter subcategory names, one per line. They will be added to {category?.name}.
                </DialogDescription>
              </DialogHeader>
              <Textarea
                placeholder="Subcategory 1&#10;Subcategory 2&#10;Subcategory 3"
                value={bulkImportText}
                onChange={(e) => setBulkImportText(e.target.value)}
                className="min-h-[200px]"
                data-testid="textarea-bulk-import-subcategories"
              />
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                  data-testid="button-cancel-import-subcategories"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleBulkImport}
                  disabled={bulkImportMutation.isPending}
                  data-testid="button-submit-import-subcategories"
                >
                  {bulkImportMutation.isPending ? "Importing..." : "Import"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Subcategories Table */}
        <Card>
          <CardHeader>
            <CardTitle>Subcategories</CardTitle>
            <CardDescription>All subcategories under {category?.name}</CardDescription>
          </CardHeader>
          <CardContent>
            {subCategories.length === 0 ? (
              <div className="text-center py-12">
                <Folder className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No subcategories found</p>
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
                        Followers
                      </th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">
                        Viewers
                      </th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {subCategories.map((sub: SubCategory) => (
                      <tr
                        key={sub._id}
                        className="border-b border-border hover:bg-muted/50 transition-colors"
                        data-testid={`row-subcategory-${sub._id}`}
                      >
                        <td className="py-3 px-4">
                          {sub.icon ? (
                            <img
                              src={`https://api.iconaapp.com/${sub.icon}`}
                              alt={sub.name}
                              className="w-16 h-16 object-cover rounded-md"
                              data-testid={`img-subcategory-${sub._id}`}
                            />
                          ) : (
                            <div className="w-16 h-16 bg-muted rounded-md flex items-center justify-center">
                              <Folder className="h-6 w-6 text-muted-foreground" />
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <span 
                            className="font-medium text-foreground"
                            data-testid={`text-subcategory-name-${sub._id}`}
                          >
                            {sub.name}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="text-sm text-muted-foreground">
                            {sub.followersCount || 0}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="text-sm text-muted-foreground">
                            {sub.viewersCount || 0}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex justify-end">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  data-testid={`button-actions-${sub._id}`}
                                >
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                  onClick={() => handleConvertToParent(sub._id)}
                                  data-testid={`button-convert-to-parent-${sub._id}`}
                                >
                                  <ArrowUpFromLine className="h-4 w-4 mr-2" />
                                  Convert to Parent
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => setSubcategoryToDelete(sub._id)}
                                  data-testid={`button-delete-subcategory-${sub._id}`}
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
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={!!subcategoryToDelete} onOpenChange={(open) => !open && setSubcategoryToDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Subcategory</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this subcategory? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel data-testid="button-cancel-delete-subcategory">Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteSubcategory}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                data-testid="button-confirm-delete-subcategory"
              >
                {deleteMutation.isPending ? "Deleting..." : "Delete"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AdminLayout>
  );
}
