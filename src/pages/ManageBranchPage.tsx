import React, { useState, useEffect } from 'react';
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
import {
  getBranches,
  addBranch,
  updateBranch,
  deleteBranch,
  deleteMultipleBranches,
  Branch,
} from '@/functions/branch';

const ManageBranchPage: React.FC = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBranches, setSelectedBranches] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Dialog states
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isUpdateDialogOpen, setIsUpdateDialogOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [isDeleteSelectedConfirmOpen, setIsDeleteSelectedConfirmOpen] = useState(false);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);

  // Form data
  const [currentBranch, setCurrentBranch] = useState<Branch | null>(null);
  const [newBranch, setNewBranch] = useState<Omit<Branch, 'id' | 'createdAt'>>({
    branchName: '',
    district: '',
    sector: '',
    cell: '',
    village: '',
    businessId: user?.businessId || '',
  });
  const [branchToDelete, setBranchToDelete] = useState<string | null>(null);

  const isAdmin = user?.role === 'admin';
  const businessId = user?.businessId;

  // Fetch branches for user's business
  useEffect(() => {
    const fetchBranches = async () => {
      if (!businessId) {
        setLoading(false);
        return;
      }
      setLoading(true);
      const data = await getBranches(businessId);
      setBranches(data);
      setLoading(false);
    };
    fetchBranches();
  }, [businessId]);

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

  const filteredBranches = branches.filter(branch =>
    [branch.branchName, branch.district, branch.sector, branch.cell, branch.village]
      .join(' ')
      .toLowerCase()
      .includes(searchTerm.toLowerCase())
  );

  // Create branch
  const handleCreateBranch = async () => {
    const { branchName, district, sector, cell, village } = newBranch;
    if (!branchName || !district || !sector || !cell || !village) {
      toast({ title: 'Error', description: 'Please fill all fields', variant: 'destructive' });
      return;
    }
    if (!businessId) {
      toast({ title: 'Error', description: 'No business associated with your account', variant: 'destructive' });
      return;
    }

    setActionLoading(true);
    const createdBranch = await addBranch({ ...newBranch, businessId });
    if (createdBranch) {
      setBranches(prev => [...prev, createdBranch]);
      setNewBranch({ branchName: '', district: '', sector: '', cell: '', village: '', businessId });
      setIsCreateDialogOpen(false);
    }
    setActionLoading(false);
  };

  // Update branch
  const handleUpdateBranch = async () => {
    if (!currentBranch?.id) return;

    setActionLoading(true);
    const success = await updateBranch(currentBranch.id, {
      branchName: currentBranch.branchName,
      district: currentBranch.district,
      sector: currentBranch.sector,
      cell: currentBranch.cell,
      village: currentBranch.village,
    });
    if (success) {
      setBranches(prev => prev.map(b => (b.id === currentBranch.id ? currentBranch : b)));
      setIsUpdateDialogOpen(false);
      setCurrentBranch(null);
    }
    setActionLoading(false);
  };

  // Delete single branch
  const handleDeleteBranch = async () => {
    if (!branchToDelete) return;
    setActionLoading(true);
    const success = await deleteBranch(branchToDelete);
    if (success) {
      setBranches(prev => prev.filter(b => b.id !== branchToDelete));
      setSelectedBranches(prev => prev.filter(id => id !== branchToDelete));
      setBranchToDelete(null);
      setIsDeleteConfirmOpen(false);
    }
    setActionLoading(false);
  };

  // Delete multiple branches
  const handleDeleteSelected = async () => {
    if (selectedBranches.length === 0) return;
    setActionLoading(true);
    const success = await deleteMultipleBranches(selectedBranches);
    if (success) {
      setBranches(prev => prev.filter(b => !selectedBranches.includes(b.id!)));
      setSelectedBranches([]);
      setIsDeleteSelectedConfirmOpen(false);
    }
    setActionLoading(false);
  };

  const handleSelectBranch = (id: string) => {
    setSelectedBranches(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const selectAll = () => {
    if (selectedBranches.length === filteredBranches.length) {
      setSelectedBranches([]);
    } else {
      setSelectedBranches(filteredBranches.map(b => b.id!).filter(Boolean));
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-64px)]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  // Staff view - only list
  if (!isAdmin) {
    return (
      <>
        <SEOHelmet title="Branches" description="View all branches" />
        <div className="space-y-6 p-4 md:p-6 bg-gray-50 dark:bg-gray-950 min-h-[calc(100vh-64px)]">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Branches</h1>
          <div className="overflow-x-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Branch Name</TableHead>
                  <TableHead>District</TableHead>
                  <TableHead>Sector</TableHead>
                  <TableHead>Cell</TableHead>
                  <TableHead>Village</TableHead>
                  <TableHead>Created At</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredBranches.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                      No branches found.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredBranches.map(branch => (
                    <TableRow key={branch.id}>
                      <TableCell className="font-medium">{branch.branchName}</TableCell>
                      <TableCell>{branch.district}</TableCell>
                      <TableCell>{branch.sector}</TableCell>
                      <TableCell>{branch.cell}</TableCell>
                      <TableCell>{branch.village}</TableCell>
                      <TableCell>{formatDate(branch.createdAt || '')}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </>
    );
  }

  // Admin full view
  return (
    <>
      <SEOHelmet title="Manage Branches" description="Create, update, delete branches" />
      <div className="space-y-6 p-4 md:p-6 bg-gray-50 dark:bg-gray-950 min-h-[calc(100vh-64px)]">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Manage Branches</h1>
            <p className="text-gray-600 dark:text-gray-400">Create, update, or delete branches</p>
          </div>
          <div className="flex gap-3">
            <Button onClick={() => setIsCreateDialogOpen(true)} disabled={actionLoading}>
              <PlusCircle className="mr-2 h-4 w-4" />
              Add Branch
            </Button>
            <Button
              variant="destructive"
              onClick={() => setIsDeleteSelectedConfirmOpen(true)}
              disabled={selectedBranches.length === 0 || actionLoading}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete Selected
            </Button>
          </div>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <Input
            placeholder="Search branches..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Table */}
        <div className="overflow-x-auto rounded-lg border bg-white dark:bg-gray-800">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox
                    checked={selectedBranches.length === filteredBranches.length && filteredBranches.length > 0}
                    onCheckedChange={selectAll}
                  />
                </TableHead>
                <TableHead>Branch Name</TableHead>
                <TableHead>District</TableHead>
                <TableHead>Sector</TableHead>
                <TableHead>Cell</TableHead>
                <TableHead>Village</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredBranches.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-12 text-gray-500">
                    No branches found. Click "Add Branch" to create one.
                  </TableCell>
                </TableRow>
              ) : (
                filteredBranches.map(branch => (
                  <TableRow key={branch.id}>
                    <TableCell>
                      <Checkbox
                        checked={selectedBranches.includes(branch.id!)}
                        onCheckedChange={() => handleSelectBranch(branch.id!)}
                      />
                    </TableCell>
                    <TableCell className="font-medium">{branch.branchName}</TableCell>
                    <TableCell>{branch.district}</TableCell>
                    <TableCell>{branch.sector}</TableCell>
                    <TableCell>{branch.cell}</TableCell>
                    <TableCell>{branch.village}</TableCell>
                    <TableCell>{formatDate(branch.createdAt || '')}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setCurrentBranch(branch);
                            setIsDetailsDialogOpen(true);
                          }}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setCurrentBranch(branch);
                            setIsUpdateDialogOpen(true);
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setBranchToDelete(branch.id!);
                            setIsDeleteConfirmOpen(true);
                          }}
                        >
                          <Trash2 className="h-4 w-4 text-red-600" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Create Dialog */}
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Branch</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label>Branch Name</Label>
                <Input
                  value={newBranch.branchName}
                  onChange={e => setNewBranch(prev => ({ ...prev, branchName: e.target.value }))}
                  placeholder="e.g., Main Branch"
                />
              </div>
              <div className="grid gap-2">
                <Label>District</Label>
                <Input
                  value={newBranch.district}
                  onChange={e => setNewBranch(prev => ({ ...prev, district: e.target.value }))}
                  placeholder="e.g., Gasabo"
                />
              </div>
              <div className="grid gap-2">
                <Label>Sector</Label>
                <Input
                  value={newBranch.sector}
                  onChange={e => setNewBranch(prev => ({ ...prev, sector: e.target.value }))}
                  placeholder="e.g., Kacyiru"
                />
              </div>
              <div className="grid gap-2">
                <Label>Cell</Label>
                <Input
                  value={newBranch.cell}
                  onChange={e => setNewBranch(prev => ({ ...prev, cell: e.target.value }))}
                  placeholder="e.g., Kamatamu"
                />
              </div>
              <div className="grid gap-2">
                <Label>Village</Label>
                <Input
                  value={newBranch.village}
                  onChange={e => setNewBranch(prev => ({ ...prev, village: e.target.value }))}
                  placeholder="e.g., Kibaza"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateBranch} disabled={actionLoading}>
                {actionLoading && <LoadingSpinner size="sm" className="mr-2" />}
                Create Branch
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Update Dialog */}
        <Dialog open={isUpdateDialogOpen} onOpenChange={setIsUpdateDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Update Branch</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label>Branch Name</Label>
                <Input
                  value={currentBranch?.branchName || ''}
                  onChange={e => setCurrentBranch(prev => prev ? { ...prev, branchName: e.target.value } : null)}
                />
              </div>
              <div className="grid gap-2">
                <Label>District</Label>
                <Input
                  value={currentBranch?.district || ''}
                  onChange={e => setCurrentBranch(prev => prev ? { ...prev, district: e.target.value } : null)}
                />
              </div>
              <div className="grid gap-2">
                <Label>Sector</Label>
                <Input
                  value={currentBranch?.sector || ''}
                  onChange={e => setCurrentBranch(prev => prev ? { ...prev, sector: e.target.value } : null)}
                />
              </div>
              <div className="grid gap-2">
                <Label>Cell</Label>
                <Input
                  value={currentBranch?.cell || ''}
                  onChange={e => setCurrentBranch(prev => prev ? { ...prev, cell: e.target.value } : null)}
                />
              </div>
              <div className="grid gap-2">
                <Label>Village</Label>
                <Input
                  value={currentBranch?.village || ''}
                  onChange={e => setCurrentBranch(prev => prev ? { ...prev, village: e.target.value } : null)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsUpdateDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleUpdateBranch} disabled={actionLoading}>
                {actionLoading && <LoadingSpinner size="sm" className="mr-2" />}
                Save Changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Details Dialog */}
        <Dialog open={isDetailsDialogOpen} onOpenChange={setIsDetailsDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Branch Details</DialogTitle>
            </DialogHeader>
            {currentBranch && (
              <div className="space-y-4 py-4">
                <div className="flex items-center gap-2">
                  <strong>Branch Name:</strong> {currentBranch.branchName}
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" /> <strong>District:</strong> {currentBranch.district}
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" /> <strong>Sector:</strong> {currentBranch.sector}
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" /> <strong>Cell:</strong> {currentBranch.cell}
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" /> <strong>Village:</strong> {currentBranch.village}
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4" /> <strong>Created:</strong> {formatDate(currentBranch.createdAt || '')}
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDetailsDialogOpen(false)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Single Confirm */}
        <Dialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Branch?</DialogTitle>
              <DialogDescription>
                This action cannot be undone. This branch will be permanently deleted.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDeleteConfirmOpen(false)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleDeleteBranch} disabled={actionLoading}>
                {actionLoading && <LoadingSpinner size="sm" className="mr-2" />}
                Delete
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Selected Confirm */}
        <Dialog open={isDeleteSelectedConfirmOpen} onOpenChange={setIsDeleteSelectedConfirmOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Selected Branches?</DialogTitle>
              <DialogDescription>
                {selectedBranches.length} branch(es) will be permanently deleted. This cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDeleteSelectedConfirmOpen(false)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleDeleteSelected} disabled={actionLoading}>
                {actionLoading && <LoadingSpinner size="sm" className="mr-2" />}
                Delete Selected
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </>
  );
};

export default ManageBranchPage;