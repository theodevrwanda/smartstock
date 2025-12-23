import React, { useState, useEffect } from 'react';
import SEOHelmet from '@/components/SEOHelmet';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, PlusCircle, Eye, Edit, Trash2, UserPlus, CloudOff } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import {
  getEmployees,
  createEmployee,
  updateEmployee,
  assignBranchToEmployee,
  deleteEmployee,
  deleteMultipleEmployees,
  Employee,
} from '@/functions/employees';
import { getBranches, Branch } from '@/functions/branch';

const EmployeeRowSkeleton = () => (
  <TableRow>
    <TableCell><Skeleton className="h-4 w-4 rounded" /></TableCell>
    <TableCell><Skeleton className="h-5 w-48" /></TableCell>
    <TableCell><Skeleton className="h-5 w-64" /></TableCell>
    <TableCell><Skeleton className="h-5 w-36" /></TableCell>
    <TableCell><Skeleton className="h-5 w-32" /></TableCell>
    <TableCell><Skeleton className="h-5 w-32" /></TableCell>
    <TableCell><Skeleton className="h-5 w-20" /></TableCell>
    <TableCell><Skeleton className="h-5 w-40" /></TableCell>
    <TableCell><Skeleton className="h-5 w-20" /></TableCell>
    <TableCell><Skeleton className="h-5 w-36" /></TableCell>
    <TableCell className="text-right">
      <div className="flex justify-end gap-1">
        <Skeleton className="h-8 w-8 rounded-md" />
        <Skeleton className="h-8 w-8 rounded-md" />
        <Skeleton className="h-8 w-8 rounded-md" />
        <Skeleton className="h-8 w-8 rounded-md" />
      </div>
    </TableCell>
  </TableRow>
);

const PageSkeleton = () => (
  <div className="space-y-6 p-4 md:p-6 min-h-[calc(100vh-64px)]">
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
      <div>
        <Skeleton className="h-9 w-80 mb-2" />
        <Skeleton className="h-5 w-96" />
      </div>
      <div className="flex gap-3">
        <Skeleton className="h-10 w-40 rounded-md" />
        <Skeleton className="h-10 w-44 rounded-md" />
      </div>
    </div>
    <Skeleton className="h-10 w-full max-w-md rounded-md" />
    <div className="overflow-x-auto border rounded-lg">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12"><Skeleton className="h-4 w-4" /></TableHead>
            <TableHead><Skeleton className="h-5 w-32" /></TableHead>
            <TableHead><Skeleton className="h-5 w-64" /></TableHead>
            <TableHead><Skeleton className="h-5 w-36" /></TableHead>
            <TableHead><Skeleton className="h-5 w-32" /></TableHead>
            <TableHead><Skeleton className="h-5 w-32" /></TableHead>
            <TableHead><Skeleton className="h-5 w-20" /></TableHead>
            <TableHead><Skeleton className="h-5 w-40" /></TableHead>
            <TableHead><Skeleton className="h-5 w-20" /></TableHead>
            <TableHead><Skeleton className="h-5 w-36" /></TableHead>
            <TableHead className="text-right"><Skeleton className="h-5 w-32 ml-auto" /></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {[...Array(10)].map((_, i) => <EmployeeRowSkeleton key={i} />)}
        </TableBody>
      </Table>
    </div>
  </div>
);

const ManageEmployeesPage: React.FC = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [branchMap, setBranchMap] = useState<Map<string, string>>(new Map());
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  // Dialog states
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isUpdateDialogOpen, setIsUpdateDialogOpen] = useState(false);
  const [isAssignBranchDialogOpen, setIsAssignBranchDialogOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [isDeleteSelectedConfirmOpen, setIsDeleteSelectedConfirmOpen] = useState(false);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);

  // Form data
  const [currentEmployee, setCurrentEmployee] = useState<Employee | null>(null);
  const [newEmployee, setNewEmployee] = useState({
    email: '',
    firstName: '',
    lastName: '',
    phone: '',
    district: '',
    sector: '',
    cell: '',
    village: '',
    gender: 'male' as 'male' | 'female',
    branch: null as string | null,
  });
  const [employeeToDelete, setEmployeeToDelete] = useState<string | null>(null);
  const [assignBranchId, setAssignBranchId] = useState<string | null>(null);

  const isAdmin = user?.role === 'admin';
  const businessId = user?.businessId;
  const businessName = user?.businessName || 'RwandaScratch';

  // Online/offline detection
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Fetch data
  useEffect(() => {
    if (!businessId) {
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      setLoading(true);
      try {
        const [emps, branchList] = await Promise.all([
          getEmployees(),
          getBranches(businessId),
        ]);

        const myEmployees = emps.filter(e => e.businessId === businessId);
        setEmployees(myEmployees);
        setBranches(branchList);

        const map = new Map<string, string>();
        map.set('unassigned', 'Unassigned');
        branchList.forEach(b => map.set(b.id!, b.branchName));
        setBranchMap(map);
      } catch {
        toast({ title: 'Error', description: 'Failed to load data', variant: 'destructive' });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [businessId]);

  const getBranchName = (id: string | null) => branchMap.get(id || 'unassigned') || 'Unassigned';

  const filteredEmployees = employees.filter(emp =>
    `${emp.firstName} ${emp.lastName} ${emp.email} ${emp.phone} ${getBranchName(emp.branch)} ${emp.role}`
      .toLowerCase()
      .includes(searchTerm.toLowerCase())
  );

  const handleCreateEmployee = async () => {
    if (!newEmployee.email || !newEmployee.firstName || !newEmployee.lastName) {
      toast({ title: 'Error', description: 'Email, First Name and Last Name required', variant: 'destructive' });
      return;
    }

    setActionLoading(true);
    try {
      const created = await createEmployee({
        ...newEmployee,
        businessId,
        businessName,
      });

      if (created) {
        setEmployees(prev => [...prev, created]);
        toast({ title: 'Success', description: 'Employee created! Password: 1234567' });
        setNewEmployee({
          email: '',
          firstName: '',
          lastName: '',
          phone: '',
          district: '',
          sector: '',
          cell: '',
          village: '',
          gender: 'male',
          branch: null,
        });
        setIsCreateDialogOpen(false);
      }
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateEmployee = async () => {
    if (!currentEmployee?.id) return;
    setActionLoading(true);
    try {
      const success = await updateEmployee(currentEmployee.id, {
        firstName: currentEmployee.firstName,
        lastName: currentEmployee.lastName,
        phone: currentEmployee.phone,
        district: currentEmployee.district,
        sector: currentEmployee.sector,
        cell: currentEmployee.cell,
        village: currentEmployee.village,
        role: currentEmployee.role,
        branch: currentEmployee.branch,
        isActive: currentEmployee.isActive,
      });
      if (success) {
        setEmployees(prev => prev.map(e => e.id === currentEmployee.id ? currentEmployee : e));
        toast({ title: 'Success', description: 'Employee updated' });
        setIsUpdateDialogOpen(false);
      }
    } catch {
      toast({ title: 'Error', description: 'Update failed', variant: 'destructive' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleAssignBranch = async () => {
    if (!currentEmployee?.id) return;
    setActionLoading(true);
    try {
      const success = await assignBranchToEmployee(currentEmployee.id, assignBranchId);
      if (success) {
        setEmployees(prev => prev.map(e => e.id === currentEmployee.id ? { ...e, branch: assignBranchId } : e));
        toast({ title: 'Success', description: 'Branch assigned' });
        setIsAssignBranchDialogOpen(false);
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to assign branch', variant: 'destructive' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteEmployee = async () => {
    if (!employeeToDelete) return;
    setActionLoading(true);
    try {
      await deleteEmployee(employeeToDelete);
      setEmployees(prev => prev.filter(e => e.id !== employeeToDelete));
      setSelectedEmployees(prev => prev.filter(id => id !== employeeToDelete));
      toast({ title: 'Deleted', description: 'Employee removed' });
      setIsDeleteConfirmOpen(false);
    } catch {
      toast({ title: 'Error', description: 'Delete failed', variant: 'destructive' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedEmployees.length === 0) return;
    setActionLoading(true);
    try {
      await deleteMultipleEmployees(selectedEmployees);
      setEmployees(prev => prev.filter(e => !selectedEmployees.includes(e.id!)));
      setSelectedEmployees([]);
      toast({ title: 'Deleted', description: `${selectedEmployees.length} employees removed` });
      setIsDeleteSelectedConfirmOpen(false);
    } catch {
      toast({ title: 'Error', description: 'Bulk delete failed', variant: 'destructive' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleSelect = (id: string) => {
    setSelectedEmployees(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const selectAll = () => {
    if (selectedEmployees.length === filteredEmployees.length && filteredEmployees.length > 0) {
      setSelectedEmployees([]);
    } else {
      setSelectedEmployees(filteredEmployees.map(e => e.id!));
    }
  };

  if (loading) {
    return (
      <>
        <SEOHelmet title="Manage Employees" />
        <PageSkeleton />
      </>
    );
  }

  if (!isAdmin) {
    return (
      <>
        <SEOHelmet title="Employees" />
        <div className="space-y-6 p-4 md:p-6 min-h-[calc(100vh-64px)]">
          <h1 className="text-3xl font-bold">Employees</h1>
          <div className="overflow-x-auto border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Branch</TableHead>
                  <TableHead>Active</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEmployees.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      No employees found.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredEmployees.map(emp => (
                    <TableRow key={emp.id}>
                      <TableCell className="font-medium">{emp.firstName} {emp.lastName}</TableCell>
                      <TableCell>{emp.email}</TableCell>
                      <TableCell>{emp.phone || '-'}</TableCell>
                      <TableCell>{emp.role}</TableCell>
                      <TableCell>{getBranchName(emp.branch)}</TableCell>
                      <TableCell>{emp.isActive ? 'Yes' : 'No'}</TableCell>
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

  return (
    <>
      <SEOHelmet title="Manage Employees" />
      <div className="space-y-6 p-4 md:p-6 min-h-[calc(100vh-64px)]">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold">Manage Employees</h1>
            <p className="text-muted-foreground">Create and manage staff accounts</p>
            {!isOnline && (
              <p className="text-orange-600 text-sm mt-2 flex items-center gap-2">
                <CloudOff className="h-4 w-4" />
                Offline – changes will sync later
              </p>
            )}
          </div>
          <div className="flex gap-3">
            <Button onClick={() => setIsCreateDialogOpen(true)} disabled={actionLoading}>
              <PlusCircle className="mr-2 h-4 w-4" />
              Add Employee
            </Button>
            <Button
              variant="destructive"
              onClick={() => setIsDeleteSelectedConfirmOpen(true)}
              disabled={selectedEmployees.length === 0 || actionLoading}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete Selected
            </Button>
          </div>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={20} />
          <Input
            placeholder="Search employees..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Table */}
        <div className="overflow-x-auto border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox
                    checked={selectedEmployees.length === filteredEmployees.length && filteredEmployees.length > 0}
                    onCheckedChange={selectAll}
                  />
                </TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>District</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Branch</TableHead>
                <TableHead>Active</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredEmployees.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center py-12 text-muted-foreground">
                    No employees found. Click "Add Employee" to create one.
                  </TableCell>
                </TableRow>
              ) : (
                filteredEmployees.map(emp => (
                  <TableRow key={emp.id}>
                    <TableCell>
                      <Checkbox
                        checked={selectedEmployees.includes(emp.id!)}
                        onCheckedChange={() => handleSelect(emp.id!)}
                      />
                    </TableCell>
                    <TableCell className="font-medium">{emp.firstName} {emp.lastName}</TableCell>
                    <TableCell>{emp.email}</TableCell>
                    <TableCell>{emp.phone || '-'}</TableCell>
                    <TableCell>{emp.district || '-'}</TableCell>
                    <TableCell>{emp.role}</TableCell>
                    <TableCell>{getBranchName(emp.branch)}</TableCell>
                    <TableCell>{emp.isActive ? 'Yes' : 'No'}</TableCell>
                    <TableCell>{emp.createdAt ? new Date(emp.createdAt).toLocaleDateString() : '-'}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button size="sm" variant="ghost" onClick={() => { setCurrentEmployee(emp); setIsDetailsDialogOpen(true); }}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => { setCurrentEmployee(emp); setIsUpdateDialogOpen(true); }}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => { setCurrentEmployee(emp); setAssignBranchId(emp.branch); setIsAssignBranchDialogOpen(true); }}>
                          <UserPlus className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => { setEmployeeToDelete(emp.id!); setIsDeleteConfirmOpen(true); }}>
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
          <DialogContent className="max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Employee</DialogTitle>
              <DialogDescription>
                Default password will be <strong>1234567</strong>
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="create-email">Email *</Label>
                <Input
                  id="create-email"
                  type="email"
                  value={newEmployee.email}
                  onChange={e => setNewEmployee(p => ({ ...p, email: e.target.value }))}
                  placeholder="employee@example.com"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="create-firstName">First Name *</Label>
                <Input
                  id="create-firstName"
                  value={newEmployee.firstName}
                  onChange={e => setNewEmployee(p => ({ ...p, firstName: e.target.value }))}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="create-lastName">Last Name *</Label>
                <Input
                  id="create-lastName"
                  value={newEmployee.lastName}
                  onChange={e => setNewEmployee(p => ({ ...p, lastName: e.target.value }))}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="create-phone">Phone</Label>
                <Input
                  id="create-phone"
                  value={newEmployee.phone}
                  onChange={e => setNewEmployee(p => ({ ...p, phone: e.target.value }))}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="create-district">District</Label>
                <Input
                  id="create-district"
                  value={newEmployee.district}
                  onChange={e => setNewEmployee(p => ({ ...p, district: e.target.value }))}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="create-sector">Sector</Label>
                <Input
                  id="create-sector"
                  value={newEmployee.sector}
                  onChange={e => setNewEmployee(p => ({ ...p, sector: e.target.value }))}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="create-cell">Cell</Label>
                <Input
                  id="create-cell"
                  value={newEmployee.cell}
                  onChange={e => setNewEmployee(p => ({ ...p, cell: e.target.value }))}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="create-village">Village</Label>
                <Input
                  id="create-village"
                  value={newEmployee.village}
                  onChange={e => setNewEmployee(p => ({ ...p, village: e.target.value }))}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="create-gender">Gender</Label>
                <Select value={newEmployee.gender} onValueChange={v => setNewEmployee(p => ({ ...p, gender: v as 'male' | 'female' }))}>
                  <SelectTrigger id="create-gender">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="create-branch">Branch (Optional)</Label>
                <Select
                  value={newEmployee.branch || 'unassigned'}
                  onValueChange={v => setNewEmployee(p => ({ ...p, branch: v === 'unassigned' ? null : v }))}
                >
                  <SelectTrigger id="create-branch">
                    <SelectValue placeholder="Select branch" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unassigned">Unassigned</SelectItem>
                    {branches.map(b => (
                      <SelectItem key={b.id} value={b.id!}>
                        {b.branchName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateEmployee} disabled={actionLoading}>
                {actionLoading ? 'Creating...' : 'Create Employee'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Update Dialog */}
        <Dialog open={isUpdateDialogOpen} onOpenChange={setIsUpdateDialogOpen}>
          <DialogContent className="max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Update Employee</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label>Email</Label>
                <Input value={currentEmployee?.email || ''} disabled />
              </div>
              <div className="grid gap-2">
                <Label>First Name</Label>
                <Input
                  value={currentEmployee?.firstName || ''}
                  onChange={e => setCurrentEmployee(prev => prev ? { ...prev, firstName: e.target.value } : null)}
                />
              </div>
              <div className="grid gap-2">
                <Label>Last Name</Label>
                <Input
                  value={currentEmployee?.lastName || ''}
                  onChange={e => setCurrentEmployee(prev => prev ? { ...prev, lastName: e.target.value } : null)}
                />
              </div>
              <div className="grid gap-2">
                <Label>Phone</Label>
                <Input
                  value={currentEmployee?.phone || ''}
                  onChange={e => setCurrentEmployee(prev => prev ? { ...prev, phone: e.target.value } : null)}
                />
              </div>
              <div className="grid gap-2">
                <Label>District</Label>
                <Input
                  value={currentEmployee?.district || ''}
                  onChange={e => setCurrentEmployee(prev => prev ? { ...prev, district: e.target.value } : null)}
                />
              </div>
              <div className="grid gap-2">
                <Label>Sector</Label>
                <Input
                  value={currentEmployee?.sector || ''}
                  onChange={e => setCurrentEmployee(prev => prev ? { ...prev, sector: e.target.value } : null)}
                />
              </div>
              <div className="grid gap-2">
                <Label>Cell</Label>
                <Input
                  value={currentEmployee?.cell || ''}
                  onChange={e => setCurrentEmployee(prev => prev ? { ...prev, cell: e.target.value } : null)}
                />
              </div>
              <div className="grid gap-2">
                <Label>Village</Label>
                <Input
                  value={currentEmployee?.village || ''}
                  onChange={e => setCurrentEmployee(prev => prev ? { ...prev, village: e.target.value } : null)}
                />
              </div>
              <div className="grid gap-2">
                <Label>Role</Label>
                <Select
                  value={currentEmployee?.role || 'staff'}
                  onValueChange={v => setCurrentEmployee(prev => prev ? { ...prev, role: v as 'admin' | 'staff' } : null)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="staff">Staff</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Branch</Label>
                <Select
                  value={currentEmployee?.branch || 'unassigned'}
                  onValueChange={v => setCurrentEmployee(prev => prev ? { ...prev, branch: v === 'unassigned' ? null : v } : null)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unassigned">Unassigned</SelectItem>
                    {branches.map(b => (
                      <SelectItem key={b.id} value={b.id!}>
                        {b.branchName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Active Status</Label>
                <Checkbox
                  checked={currentEmployee?.isActive || false}
                  onCheckedChange={c => setCurrentEmployee(prev => prev ? { ...prev, isActive: !!c } : null)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsUpdateDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleUpdateEmployee} disabled={actionLoading}>
                {actionLoading ? 'Saving...' : 'Save Changes'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Assign Branch Dialog */}
        <Dialog open={isAssignBranchDialogOpen} onOpenChange={setIsAssignBranchDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Assign Branch</DialogTitle>
              <DialogDescription>
                Select a branch for {currentEmployee ? `${currentEmployee.firstName} ${currentEmployee.lastName}` : ''}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <Label>Branch</Label>
              <Select
                value={assignBranchId || 'unassigned'}
                onValueChange={v => setAssignBranchId(v === 'unassigned' ? null : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select branch" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unassigned">Unassigned</SelectItem>
                  {branches.map(b => (
                    <SelectItem key={b.id} value={b.id!}>
                      {b.branchName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAssignBranchDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleAssignBranch} disabled={actionLoading}>
                {actionLoading ? 'Assigning...' : 'Assign Branch'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Details Dialog */}
        <Dialog open={isDetailsDialogOpen} onOpenChange={setIsDetailsDialogOpen}>
          <DialogContent className="max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Employee Details</DialogTitle>
            </DialogHeader>
            {currentEmployee && (
              <div className="space-y-3 py-4">
                <div><strong>Full Name:</strong> {currentEmployee.firstName} {currentEmployee.lastName}</div>
                <div><strong>Username:</strong> {currentEmployee.username || '-'}</div>
                <div><strong>Email:</strong> {currentEmployee.email}</div>
                <div><strong>Phone:</strong> {currentEmployee.phone || '-'}</div>
                <div><strong>District:</strong> {currentEmployee.district || '-'}</div>
                <div><strong>Sector:</strong> {currentEmployee.sector || '-'}</div>
                <div><strong>Cell:</strong> {currentEmployee.cell || '-'}</div>
                <div><strong>Village:</strong> {currentEmployee.village || '-'}</div>
                <div><strong>Gender:</strong> {currentEmployee.gender || '-'}</div>
                <div><strong>Role:</strong> {currentEmployee.role}</div>
                <div><strong>Branch:</strong> {getBranchName(currentEmployee.branch)}</div>
                <div><strong>Active:</strong> {currentEmployee.isActive ? 'Yes' : 'No'}</div>
                <div><strong>Created:</strong> {currentEmployee.createdAt ? new Date(currentEmployee.createdAt).toLocaleDateString() : '-'}</div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDetailsDialogOpen(false)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Single Confirm Dialog */}
        <Dialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Employee?</DialogTitle>
              <DialogDescription>
                This action cannot be undone. The employee will be permanently removed.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDeleteConfirmOpen(false)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleDeleteEmployee} disabled={actionLoading}>
                {actionLoading ? 'Deleting...' : 'Delete'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Selected Confirm Dialog */}
        <Dialog open={isDeleteSelectedConfirmOpen} onOpenChange={setIsDeleteSelectedConfirmOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Selected Employees?</DialogTitle>
              <DialogDescription>
                {selectedEmployees.length} employee(s) will be permanently deleted. This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDeleteSelectedConfirmOpen(false)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleDeleteSelected} disabled={actionLoading}>
                {actionLoading ? 'Deleting...' : 'Delete Selected'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </>
  );
};

export default ManageEmployeesPage;