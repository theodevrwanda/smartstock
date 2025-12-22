import React, { useState, useEffect } from 'react';
import axios from 'axios';
import SEOHelmet from '@/components/SEOHelmet';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Search, PlusCircle, Edit, Trash2, MapPin, Clock, Eye } from 'lucide-react';
import LoadingSpinner from '@/components/LoadingSpinner';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

// Define Branch interface based on Mongoose schema
interface Branch {
  id: string;
  branchName: string;
  district: string;
  sector: string;
  cell: string;
  village: string;
  createdAt: string;
}

// Use environment variable for API base URL
const API_BASE_URL = import.meta.env.VITE_API_URL;
const BRANCH_API_URL = `${API_BASE_URL}/branches`;

const ManageBranchPage: React.FC = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBranches, setSelectedBranches] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isUpdateDialogOpen, setIsUpdateDialogOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [isDeleteSelectedConfirmOpen, setIsDeleteSelectedConfirmOpen] = useState(false);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const [currentBranch, setCurrentBranch] = useState<Branch | null>(null);
  const [newBranch, setNewBranch] = useState<Partial<Branch>>({
    branchName: '',
    district: '',
    sector: '',
    cell: '',
    village: '',
  });
  const [branchToDelete, setBranchToDelete] = useState<string | null>(null);

  // Check if user is admin
  const isAdmin = user?.role === 'admin';

  // Fetch branches from API for admins only
  useEffect(() => {
    if (!isAdmin) {
      setLoading(false);
      return;
    }
    const fetchBranches = async () => {
      try {
        setLoading(true);
        const response = await axios.get(BRANCH_API_URL, { withCredentials: true });
        const branchesData = response.data.data.branches.map((branch: any) => ({
          id: branch._id,
          branchName: branch.branchName,
          district: branch.district,
          sector: branch.sector,
          cell: branch.cell,
          village: branch.village,
          createdAt: branch.createdAt,
        }));
        setBranches(branchesData);
        setLoading(false);
      } catch (error: any) {
        toast({
          title: 'Error',
          description: 'Failed to fetch branches: ' + (error.response?.data?.message || error.message),
          variant: 'destructive',
        });
        setLoading(false);
      }
    };
    fetchBranches();
  }, [toast, isAdmin]);

  // Format date for display
  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch {
      return 'Invalid Date';
    }
  };

  // Filter branches based on search term
  const filteredBranches = branches.filter(
    b =>
      b.branchName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.district.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.sector.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.cell.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.village.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Handle create branch
  const handleCreateBranch = async () => {
    if (!newBranch.branchName || !newBranch.district || !newBranch.sector || !newBranch.cell || !newBranch.village) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in all fields.',
        variant: 'destructive',
      });
      return;
    }
    try {
      setActionLoading(true);
      const response = await axios.post(BRANCH_API_URL, newBranch, { withCredentials: true });
      const newBranchData: Branch = {
        id: response.data.data.branch._id,
        branchName: response.data.data.branch.branchName,
        district: response.data.data.branch.district,
        sector: response.data.data.branch.sector,
        cell: response.data.data.branch.cell,
        village: response.data.data.branch.village,
        createdAt: response.data.data.branch.createdAt,
      };
      setBranches(prev => [...prev, newBranchData]);
      setNewBranch({ branchName: '', district: '', sector: '', cell: '', village: '' });
      setIsCreateDialogOpen(false);
      toast({
        title: 'Success',
        description: 'Branch created successfully!',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to create branch: ' + (error.response?.data?.message || error.message),
        variant: 'destructive',
      });
    } finally {
      setActionLoading(false);
    }
  };

  // Handle update branch
  const handleUpdateBranch = async () => {
    if (
      !currentBranch ||
      !currentBranch.branchName ||
      !currentBranch.district ||
      !currentBranch.sector ||
      !currentBranch.cell ||
      !currentBranch.village
    ) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in all fields.',
        variant: 'destructive',
      });
      return;
    }
    try {
      setActionLoading(true);
      const response = await axios.put(`${BRANCH_API_URL}/${currentBranch.id}`, {
        branchName: currentBranch.branchName,
        district: currentBranch.district,
        sector: currentBranch.sector,
        cell: currentBranch.cell,
        village: currentBranch.village,
      }, { withCredentials: true });
      const updatedBranch: Branch = {
        id: response.data.data.branch._id,
        branchName: response.data.data.branch.branchName,
        district: response.data.data.branch.district,
        sector: response.data.data.branch.sector,
        cell: response.data.data.branch.cell,
        village: response.data.data.branch.village,
        createdAt: response.data.data.branch.createdAt,
      };
      setBranches(prev =>
        prev.map(branch => (branch.id === updatedBranch.id ? updatedBranch : branch))
      );
      setIsUpdateDialogOpen(false);
      setCurrentBranch(null);
      toast({
        title: 'Success',
        description: 'Branch updated successfully!',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to update branch: ' + (error.response?.data?.message || error.message),
        variant: 'destructive',
      });
    } finally {
      setActionLoading(false);
    }
  };

  // Handle delete branch
  const handleDeleteBranch = async () => {
    if (!branchToDelete) return;
    try {
      setActionLoading(true);
      await axios.delete(`${BRANCH_API_URL}/${branchToDelete}`, { withCredentials: true });
      setBranches(prev => prev.filter(branch => branch.id !== branchToDelete));
      setSelectedBranches(prev => prev.filter(id => id !== branchToDelete));
      setBranchToDelete(null);
      setIsDeleteConfirmOpen(false);
      toast({
        title: 'Success',
        description: 'Branch permanently deleted!',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to delete branch: ' + (error.response?.data?.message || error.message),
        variant: 'destructive',
      });
    } finally {
      setActionLoading(false);
    }
  };

  // Handle delete selected branches
  const handleDeleteSelected = () => {
    if (selectedBranches.length === 0) {
      toast({
        title: 'No Branches Selected',
        description: 'Please select at least one branch to delete.',
        variant: 'destructive',
      });
      return;
    }
    setIsDeleteSelectedConfirmOpen(true);
  };

  // Confirm delete selected branches
  const handleConfirmDeleteSelected = async () => {
    try {
      setActionLoading(true);
      await Promise.all(
        selectedBranches.map(id =>
          axios.delete(`${BRANCH_API_URL}/${id}`, { withCredentials: true })
        )
      );
      setBranches(prev => prev.filter(branch => !selectedBranches.includes(branch.id)));
      setSelectedBranches([]);
      setIsDeleteSelectedConfirmOpen(false);
      toast({
        title: 'Success',
        description: `${selectedBranches.length} branch(es) permanently deleted!`,
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to delete branches: ' + (error.response?.data?.message || error.message),
        variant: 'destructive',
      });
    } finally {
      setActionLoading(false);
    }
  };

  // Handle branch selection
  const handleSelectBranch = (branchId: string) => {
    setSelectedBranches(prev =>
      prev.includes(branchId)
        ? prev.filter(id => id !== branchId)
        : [...prev, branchId]
    );
  };

  // Open update dialog
  const openUpdateDialog = (branch: Branch) => {
    setCurrentBranch(branch);
    setIsUpdateDialogOpen(true);
  };

  // Open details dialog
  const openDetailsDialog = (branch: Branch) => {
    setCurrentBranch(branch);
    setIsDetailsDialogOpen(true);
  };

  // Open delete confirmation dialog
  const openDeleteConfirmDialog = (branchId: string) => {
    setBranchToDelete(branchId);
    setIsDeleteConfirmOpen(true);
  };

  // Render unauthorized card for staff users
  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-64px)] p-4">
        <Card className="bg-white dark:bg-gray-800 shadow-lg rounded-lg border border-gray-200 dark:border-gray-700 w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-gray-900 dark:text-white">Access Denied</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-gray-600 dark:text-gray-400">
              You are not authorized to access this page. Only admins can manage branches.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-64px)]">
        <LoadingSpinner size="lg" className="text-blue-600" />
      </div>
    );
  }

  return (
    <>
      <SEOHelmet
        title="Branches"
        description="Manage branches for the system, including creating, updating, and deleting branches."
        canonical="https://pixelmartrw.pages.dev/branches"
      />
      <div className="space-y-6 p-4 md:p-6 bg-gray-50 dark:bg-gray-950 min-h-[calc(100vh-64px)]">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">Branches</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">Create, update, or delete branches</p>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => setIsCreateDialogOpen(true)}
              className="flex items-center gap-2 bg-blue-600 text-white hover:bg-blue-700"
              disabled={actionLoading}
            >
              {actionLoading ? (
                <LoadingSpinner size="sm" className="text-white mr-2" />
              ) : (
                <PlusCircle size={18} />
              )}
              Branch
            </Button>
            <Button
              onClick={handleDeleteSelected}
              className="flex items-center gap-2 bg-red-600 text-white hover:bg-red-700"
              disabled={selectedBranches.length === 0 || actionLoading}
            >
              {actionLoading ? (
                <LoadingSpinner size="sm" className="text-white mr-2" />
              ) : (
                <Trash2 size={18} />
              )}
             Selected
            </Button>
          </div>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          <Input
            placeholder="Search by name, district, sector, cell, or village..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="pl-10 bg-gray-50 dark:bg-gray-700 dark:text-white border border-gray-300 dark:border-gray-600 focus:ring-blue-500 focus:border-blue-500 rounded-lg"
            disabled={actionLoading}
          />
        </div>
        <hr className="my-6 border-gray-200 dark:border-gray-700" />
        {filteredBranches.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-gray-500">
            <p>No branches found. Create one to get started!</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]">
                    <Checkbox
                      checked={selectedBranches.length === filteredBranches.length && filteredBranches.length > 0}
                      onCheckedChange={() => {
                        if (selectedBranches.length === filteredBranches.length) {
                          setSelectedBranches([]);
                        } else {
                          setSelectedBranches(filteredBranches.map(b => b.id));
                        }
                      }}
                      disabled={actionLoading}
                    />
                  </TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead className="sm:hidden w-[50px]">View</TableHead>
                  <TableHead className="hidden sm:table-cell">District</TableHead>
                  <TableHead className="hidden sm:table-cell">Sector</TableHead>
                  <TableHead className="hidden sm:table-cell">Cell</TableHead>
                  <TableHead className="hidden sm:table-cell">Village</TableHead>
                  <TableHead className="hidden sm:table-cell">Created At</TableHead>
                  <TableHead className="hidden sm:table-cell w-[120px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredBranches.map(branch => (
                  <TableRow key={branch.id}>
                    <TableCell onClick={e => e.stopPropagation()}>
                      <Checkbox
                        checked={selectedBranches.includes(branch.id)}
                        onCheckedChange={() => handleSelectBranch(branch.id)}
                        disabled={actionLoading}
                      />
                    </TableCell>
                    <TableCell className="font-medium">{branch.branchName}</TableCell>
                    <TableCell className="sm:hidden" onClick={e => e.stopPropagation()}>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openDetailsDialog(branch)}
                        className="text-blue-600 hover:text-blue-700 hover:bg-blue-100 dark:text-blue-400 dark:hover:bg-blue-900"
                        title="View Details"
                        disabled={actionLoading}
                      >
                        <Eye size={14} />
                      </Button>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">{branch.district}</TableCell>
                    <TableCell className="hidden sm:table-cell">{branch.sector}</TableCell>
                    <TableCell className="hidden sm:table-cell">{branch.cell}</TableCell>
                    <TableCell className="hidden sm:table-cell">{branch.village}</TableCell>
                    <TableCell className="hidden sm:table-cell">{formatDate(branch.createdAt)}</TableCell>
                    <TableCell className="hidden sm:table-cell" onClick={e => e.stopPropagation()}>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openDetailsDialog(branch)}
                          className="text-blue-600 hover:text-blue-700 hover:bg-blue-100 dark:text-blue-400 dark:hover:bg-blue-900"
                          title="View Details"
                          disabled={actionLoading}
                        >
                          <Eye size={14} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openUpdateDialog(branch)}
                          className="text-blue-600 hover:text-blue-700 hover:bg-blue-100 dark:text-blue-400 dark:hover:bg-blue-900"
                          title="Edit"
                          disabled={actionLoading}
                        >
                          <Edit size={14} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openDeleteConfirmDialog(branch.id)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-100 dark:text-red-400 dark:hover:bg-red-900"
                          title="Delete"
                          disabled={actionLoading}
                        >
                          <Trash2 size={14} />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Create New Branch</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="branchName">Branch Name</Label>
                <Input
                  id="branchName"
                  value={newBranch.branchName}
                  onChange={e => setNewBranch(prev => ({ ...prev, branchName: e.target.value }))}
                  placeholder="e.g., Main Branch"
                  required
                  disabled={actionLoading}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="district">District</Label>
                <Input
                  id="district"
                  value={newBranch.district}
                  onChange={e => setNewBranch(prev => ({ ...prev, district: e.target.value }))}
                  placeholder="e.g., Kigali"
                  required
                  disabled={actionLoading}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="sector">Sector</Label>
                <Input
                  id="sector"
                  value={newBranch.sector}
                  onChange={e => setNewBranch(prev => ({ ...prev, sector: e.target.value }))}
                  placeholder="e.g., Kacyiru"
                  required
                  disabled={actionLoading}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="cell">Cell</Label>
                <Input
                  id="cell"
                  value={newBranch.cell}
                  onChange={e => setNewBranch(prev => ({ ...prev, cell: e.target.value }))}
                  placeholder="e.g., Kamutwa"
                  required
                  disabled={actionLoading}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="village">Village</Label>
                <Input
                  id="village"
                  value={newBranch.village}
                  onChange={e => setNewBranch(prev => ({ ...prev, village: e.target.value }))}
                  placeholder="e.g., Kibaza"
                  required
                  disabled={actionLoading}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsCreateDialogOpen(false)}
                disabled={actionLoading}
              >
                Cancel
              </Button>
              <Button
                className="bg-blue-600 text-white hover:bg-blue-700"
                onClick={handleCreateBranch}
                disabled={actionLoading}
              >
                {actionLoading && <LoadingSpinner size="sm" className="text-white mr-2" />}
                Create Branch
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        <Dialog open={isUpdateDialogOpen} onOpenChange={setIsUpdateDialogOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Update Branch</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="branchName">Branch Name</Label>
                <Input
                  id="branchName"
                  value={currentBranch?.branchName || ''}
                  onChange={e =>
                    setCurrentBranch(prev => (prev ? { ...prev, branchName: e.target.value } : null))
                  }
                  placeholder="e.g., Main Branch"
                  required
                  disabled={actionLoading}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="district">District</Label>
                <Input
                  id="district"
                  value={currentBranch?.district || ''}
                  onChange={e =>
                    setCurrentBranch(prev => (prev ? { ...prev, district: e.target.value } : null))
                  }
                  placeholder="e.g., Kigali"
                  required
                  disabled={actionLoading}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="sector">Sector</Label>
                <Input
                  id="sector"
                  value={currentBranch?.sector || ''}
                  onChange={e =>
                    setCurrentBranch(prev => (prev ? { ...prev, sector: e.target.value } : null))
                  }
                  placeholder="e.g., Kacyiru"
                  required
                  disabled={actionLoading}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="cell">Cell</Label>
                <Input
                  id="cell"
                  value={currentBranch?.cell || ''}
                  onChange={e =>
                    setCurrentBranch(prev => (prev ? { ...prev, cell: e.target.value } : null))
                  }
                  placeholder="e.g., Kamutwa"
                  required
                  disabled={actionLoading}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="village">Village</Label>
                <Input
                  id="village"
                  value={currentBranch?.village || ''}
                  onChange={e =>
                    setCurrentBranch(prev => (prev ? { ...prev, village: e.target.value } : null))
                  }
                  placeholder="e.g., Kibaza"
                  required
                  disabled={actionLoading}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsUpdateDialogOpen(false)}
                disabled={actionLoading}
              >
                Cancel
              </Button>
              <Button
                className="bg-blue-600 text-white hover:bg-blue-700"
                onClick={handleUpdateBranch}
                disabled={actionLoading}
              >
                {actionLoading && <LoadingSpinner size="sm" className="text-white mr-2" />}
                Save Changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        <Dialog open={isDetailsDialogOpen} onOpenChange={setIsDetailsDialogOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Branch Details: {currentBranch?.branchName}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              {currentBranch && (
                <>
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    <span className="font-medium flex items-center gap-1">
                      <MapPin size={16} /> District:
                    </span>{' '}
                    {currentBranch.district}
                  </p>
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    <span className="font-medium flex items-center gap-1">
                      <MapPin size={16} /> Sector:
                    </span>{' '}
                    {currentBranch.sector}
                  </p>
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    <span className="font-medium flex items-center gap-1">
                      <MapPin size={16} /> Cell:
                    </span>{' '}
                    {currentBranch.cell}
                  </p>
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    <span className="font-medium flex items-center gap-1">
                      <MapPin size={16} /> Village:
                    </span>{' '}
                    {currentBranch.village}
                  </p>
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    <span className="font-medium flex items-center gap-1">
                      <Clock size={16} /> Created At:
                    </span>{' '}
                    {formatDate(currentBranch.createdAt)}
                  </p>
                </>
              )}
            </div>
            <DialogFooter className="flex flex-col sm:flex-row justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setIsDetailsDialogOpen(false)}
                disabled={actionLoading}
              >
                Close
              </Button>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setIsDetailsDialogOpen(false);
                    if (currentBranch) openUpdateDialog(currentBranch);
                  }}
                  className="text-blue-600 hover:text-blue-700 hover:bg-blue-100 dark:text-blue-400 dark:hover:bg-blue-900"
                  title="Edit"
                  disabled={actionLoading}
                >
                  <Edit size={14} className="mr-1" />
                  Edit
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setIsDetailsDialogOpen(false);
                    if (currentBranch) openDeleteConfirmDialog(currentBranch.id);
                  }}
                  className="text-red-600 hover:text-red-700 hover:bg-red-100 dark:text-red-400 dark:hover:bg-red-900"
                  title="Delete"
                  disabled={actionLoading}
                >
                  <Trash2 size={14} className="mr-1" />
                  Delete
                </Button>
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        <Dialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Confirm Permanent Deletion</DialogTitle>
              <DialogDescription>
                Are you sure you want to permanently delete this branch? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsDeleteConfirmOpen(false)}
                disabled={actionLoading}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                className="bg-red-600 text-white hover:bg-blue-700"
                onClick={handleDeleteBranch}
                disabled={actionLoading}
              >
                {actionLoading && <LoadingSpinner size="sm" className="text-white mr-2" />}
                Delete Permanently
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        <Dialog open={isDeleteSelectedConfirmOpen} onOpenChange={setIsDeleteSelectedConfirmOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Confirm Permanent Deletion of Selected Branches</DialogTitle>
              <DialogDescription>
                Are you sure you want to permanently delete {selectedBranches.length} selected branch(es)? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsDeleteSelectedConfirmOpen(false)}
                disabled={actionLoading}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                className="bg-red-600 text-white hover:bg-blue-700"
                onClick={handleConfirmDeleteSelected}
                disabled={actionLoading}
              >
                {actionLoading && <LoadingSpinner size="sm" className="text-white mr-2" />}
                Delete Permanently
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </>
  );
};

export default ManageBranchPage;