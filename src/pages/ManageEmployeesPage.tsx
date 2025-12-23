import React, { useState, useEffect } from 'react';
import SEOHelmet from '@/components/SEOHelmet';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Search, PlusCircle, Eye, Edit, Trash2, UserPlus } from 'lucide-react';
import LoadingSpinner from '@/components/LoadingSpinner';
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

const ManageEmployeesPage: React.FC = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Dialog states
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isUpdateDialogOpen, setIsUpdateDialogOpen] = useState(false);
  const [isAssignBranchDialogOpen, setIsAssignBranchDialogOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [isDeleteSelectedConfirmOpen, setIsDeleteSelectedConfirmOpen] = useState(false);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);

  // Form data
  const [currentEmployee, setCurrentEmployee] = useState<Employee | null>(null);
  const [newEmployee, setNewEmployee] = useState<Omit<Employee, 'id' | 'createdAt' | 'isActive'>>({
    username: '',
    email: '',
    firstName: '',
    lastName: '',
    phone: '',
    district: '',
    sector: '',
    cell: '',
    village: '',
    role: 'staff',
    branch: null,
  });
  const [employeeToDelete, setEmployeeToDelete] = useState<string | null>(null);
  const [assignBranchId, setAssignBranchId] = useState<string | null>(null);

  const isAdmin = user?.role === 'admin';

  // Fetch employees and branches
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const [empData, branchData] = await Promise.all([getEmployees(), getBranches()]);
      setEmployees(empData);
      setBranches(branchData);
      setLoading(false);
    };
    fetchData();
  }, []);

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch {
      return 'Invalid Date';
    }
  };

  const filteredEmployees = employees.filter(emp =>
    [emp.username, emp.email, emp.firstName, emp.lastName, emp.phone, emp.district, emp.role]
      .join(' ')
      .toLowerCase()
      .includes(searchTerm.toLowerCase())
  );

  // Create employee
  const handleCreateEmployee = async () => {
    if (!newEmployee.email || !newEmployee.firstName || !newEmployee.lastName) {
      toast({ title: 'Error', description: 'Required fields missing', variant: 'destructive' });
      return;
    }
    setActionLoading(true);
    const created = await createEmployee(newEmployee);
    if (created) {
      setEmployees(prev => [...prev, created]);
      setNewEmployee({
        username: '',
        email: '',
        firstName: '',
        lastName: '',
        phone: '',
        district: '',
        sector: '',
        cell: '',
        village: '',
        role: 'staff',
        branch: null,
      });
      setIsCreateDialogOpen(false);
    }
    setActionLoading(false);
  };

  // Update employee
  const handleUpdateEmployee = async () => {
    if (!currentEmployee?.id) return;
    setActionLoading(true);
    const success = await updateEmployee(currentEmployee.id, {
      username: currentEmployee.username,
      firstName: currentEmployee.firstName,
      lastName: currentEmployee.lastName,
      phone: currentEmployee.phone,
      district: currentEmployee.district,
      sector: currentEmployee.sector,
      cell: currentEmployee.cell,
      village: currentEmployee.village,
      role: currentEmployee.role,
      isActive: currentEmployee.isActive,
    });
    if (success) {
      setEmployees(prev => prev.map(e => (e.id === currentEmployee.id ? currentEmployee : e)));
      setIsUpdateDialogOpen(false);
    }
    setActionLoading(false);
  };

  // Assign branch
  const handleAssignBranch = async () => {
    if (!currentEmployee?.id) return;
    setActionLoading(true);
    const success = await assignBranchToEmployee(currentEmployee.id, assignBranchId);
    if (success) {
      setEmployees(prev =>
        prev.map(e => (e.id === currentEmployee.id ? { ...e, branch: assignBranchId } : e))
      );
      setIsAssignBranchDialogOpen(false);
    }
    setActionLoading(false);
  };

  // Delete single employee
  const handleDeleteEmployee = async () => {
    if (!employeeToDelete) return;
    setActionLoading(true);
    const success = await deleteEmployee(employeeToDelete);
    if (success) {
      setEmployees(prev => prev.filter(e => e.id !== employeeToDelete));
      setSelectedEmployees(prev => prev.filter(id => id !== employeeToDelete));
      setEmployeeToDelete(null);
      setIsDeleteConfirmOpen(false);
    }
    setActionLoading(false);
  };

  // Delete selected employees
  const handleDeleteSelected = async () => {
    if (selectedEmployees.length === 0) return;
    setActionLoading(true);
    const success = await deleteMultipleEmployees(selectedEmployees);
    if (success) {
      setEmployees(prev => prev.filter(e => !selectedEmployees.includes(e.id!)));
      setSelectedEmployees([]);
      setIsDeleteSelectedConfirmOpen(false);
    }
    setActionLoading(false);
  };

  const handleSelectEmployee = (id: string) => {
    setSelectedEmployees(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  if (loading) return <LoadingSpinner size="lg" />;

  // Staff view - only list
  if (!isAdmin) {
    return (
      <>
        <SEOHelmet title="Employees" />
        <div className="space-y-6 p-4 md:p-6 bg-gray-50 dark:bg-gray-950 min-h-[calc(100vh-64px)]">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Employees</h1>
          <div className="overflow-x-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Branch</TableHead>
                  <TableHead>Active</TableHead>
                  <TableHead>Created At</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEmployees.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                      No employees found.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredEmployees.map(emp => (
                    <TableRow key={emp.id}>
                      <TableCell className="font-medium">{`${emp.firstName} ${emp.lastName}`}</TableCell>
                      <TableCell>{emp.email}</TableCell>
                      <TableCell>{emp.phone}</TableCell>
                      <TableCell>{emp.role}</TableCell>
                      <TableCell>{emp.branch || 'Unassigned'}</TableCell>
                      <TableCell>{emp.isActive ? 'Yes' : 'No'}</TableCell>
                      <TableCell>{formatDate(emp.createdAt || '')}</TableCell>
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

  // Admin full management view
  return (
    <>
      <SEOHelmet title="Manage Employees" />
      <div className="space-y-6 p-4 md:p-6 bg-gray-50 dark:bg-gray-950 min-h-[calc(100vh-64px)]">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Manage Employees</h1>
            <p className="text-gray-600 dark:text-gray-400">Create, update, assign branches</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => setIsCreateDialogOpen(true)} disabled={actionLoading}>
              <PlusCircle className="mr-2 h-4 w-4" /> Add Employee
            </Button>
            <Button
              variant="destructive"
              onClick={() => setIsDeleteSelectedConfirmOpen(true)}
              disabled={selectedEmployees.length === 0 || actionLoading}
            >
              <Trash2 className="mr-2 h-4 w-4" /> Delete Selected
            </Button>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <Input
            placeholder="Search employees..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px]">
                  <Checkbox
                    checked={selectedEmployees.length === filteredEmployees.length && filteredEmployees.length > 0}
                    onCheckedChange={checked => {
                      if (checked) setSelectedEmployees(filteredEmployees.map(e => e.id!));
                      else setSelectedEmployees([]);
                    }}
                  />
                </TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Username</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>District</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Branch</TableHead>
                <TableHead>Active</TableHead>
                <TableHead>Created At</TableHead>
                <TableHead className="w-[120px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredEmployees.map(emp => (
                <TableRow key={emp.id}>
                  <TableCell>
                    <Checkbox
                      checked={selectedEmployees.includes(emp.id!)}
                      onCheckedChange={() => handleSelectEmployee(emp.id!)}
                    />
                  </TableCell>
                  <TableCell className="font-medium">{`${emp.firstName} ${emp.lastName}`}</TableCell>
                  <TableCell>{emp.username}</TableCell>
                  <TableCell>{emp.email}</TableCell>
                  <TableCell>{emp.phone}</TableCell>
                  <TableCell>{emp.district}</TableCell>
                  <TableCell>{emp.role}</TableCell>
                  <TableCell>{emp.branch || 'Unassigned'}</TableCell>
                  <TableCell>{emp.isActive ? 'Yes' : 'No'}</TableCell>
                  <TableCell>{formatDate(emp.createdAt || '')}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => { setCurrentEmployee(emp); setIsDetailsDialogOpen(true); }}>
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => { setCurrentEmployee(emp); setIsUpdateDialogOpen(true); }}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => { setCurrentEmployee(emp); setAssignBranchId(emp.branch); setIsAssignBranchDialogOpen(true); }}>
                        <UserPlus className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => { setEmployeeToDelete(emp.id!); setIsDeleteConfirmOpen(true); }}>
                        <Trash2 className="h-4 w-4 text-red-600" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Create Dialog */}
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogContent className="sm:max-w-[425px] max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Employee</DialogTitle>
              <DialogDescription>Default password will be "123456". User can change it later.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={newEmployee.email}
                  onChange={e => setNewEmployee(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="Enter email address"
                  required
                  disabled={actionLoading}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="firstName">First Name *</Label>
                <Input
                  id="firstName"
                  value={newEmployee.firstName}
                  onChange={e => setNewEmployee(prev => ({ ...prev, firstName: e.target.value }))}
                  placeholder="Enter first name"
                  required
                  disabled={actionLoading}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="lastName">Last Name *</Label>
                <Input
                  id="lastName"
                  value={newEmployee.lastName}
                  onChange={e => setNewEmployee(prev => ({ ...prev, lastName: e.target.value }))}
                  placeholder="Enter last name"
                  required
                  disabled={actionLoading}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  value={newEmployee.phone}
                  onChange={e => setNewEmployee(prev => ({ ...prev, phone: e.target.value }))}
                  placeholder="Enter phone number"
                  disabled={actionLoading}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="district">District</Label>
                <Input
                  id="district"
                  value={newEmployee.district}
                  onChange={e => setNewEmployee(prev => ({ ...prev, district: e.target.value }))}
                  placeholder="Enter district"
                  disabled={actionLoading}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="sector">Sector</Label>
                <Input
                  id="sector"
                  value={newEmployee.sector}
                  onChange={e => setNewEmployee(prev => ({ ...prev, sector: e.target.value }))}
                  placeholder="Enter sector"
                  disabled={actionLoading}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="cell">Cell</Label>
                <Input
                  id="cell"
                  value={newEmployee.cell}
                  onChange={e => setNewEmployee(prev => ({ ...prev, cell: e.target.value }))}
                  placeholder="Enter cell"
                  disabled={actionLoading}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="village">Village</Label>
                <Input
                  id="village"
                  value={newEmployee.village}
                  onChange={e => setNewEmployee(prev => ({ ...prev, village: e.target.value }))}
                  placeholder="Enter village"
                  disabled={actionLoading}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="role">Role</Label>
                <Select
                  value={newEmployee.role}
                  onValueChange={value => setNewEmployee(prev => ({ ...prev, role: value as 'admin' | 'staff' }))}
                  disabled={actionLoading}
                >
                  <SelectTrigger id="role">
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="staff">Staff</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="branch">Branch (Optional)</Label>
                <Select
                  value={newEmployee.branch || 'unassigned'}
                  onValueChange={value => setNewEmployee(prev => ({ ...prev, branch: value === 'unassigned' ? null : value }))}
                  disabled={actionLoading}
                >
                  <SelectTrigger id="branch">
                    <SelectValue placeholder="Select branch" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unassigned">Unassigned</SelectItem>
                    {branches.map(branch => (
                      <SelectItem key={branch.id} value={branch.id!}>
                        {branch.branchName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)} disabled={actionLoading}>
                Cancel
              </Button>
              <Button onClick={handleCreateEmployee} disabled={actionLoading}>
                {actionLoading && <LoadingSpinner size="sm" className="mr-2" />}
                Create Employee
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Update Dialog */}
        <Dialog open={isUpdateDialogOpen} onOpenChange={setIsUpdateDialogOpen}>
          <DialogContent className="sm:max-w-[425px] max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Update Employee</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  value={currentEmployee?.username || ''}
                  onChange={e => setCurrentEmployee(prev => prev ? { ...prev, username: e.target.value } : null)}
                  placeholder="Enter username"
                  disabled={actionLoading}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={currentEmployee?.email || ''}
                  onChange={e => setCurrentEmployee(prev => prev ? { ...prev, email: e.target.value } : null)}
                  placeholder="Enter email address"
                  disabled={actionLoading}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="firstName">First Name</Label>
                <Input
                  id="firstName"
                  value={currentEmployee?.firstName || ''}
                  onChange={e => setCurrentEmployee(prev => prev ? { ...prev, firstName: e.target.value } : null)}
                  placeholder="Enter first name"
                  disabled={actionLoading}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="lastName">Last Name</Label>
                <Input
                  id="lastName"
                  value={currentEmployee?.lastName || ''}
                  onChange={e => setCurrentEmployee(prev => prev ? { ...prev, lastName: e.target.value } : null)}
                  placeholder="Enter last name"
                  disabled={actionLoading}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  value={currentEmployee?.phone || ''}
                  onChange={e => setCurrentEmployee(prev => prev ? { ...prev, phone: e.target.value } : null)}
                  placeholder="Enter phone number"
                  disabled={actionLoading}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="district">District</Label>
                <Input
                  id="district"
                  value={currentEmployee?.district || ''}
                  onChange={e => setCurrentEmployee(prev => prev ? { ...prev, district: e.target.value } : null)}
                  placeholder="Enter district"
                  disabled={actionLoading}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="sector">Sector</Label>
                <Input
                  id="sector"
                  value={currentEmployee?.sector || ''}
                  onChange={e => setCurrentEmployee(prev => prev ? { ...prev, sector: e.target.value } : null)}
                  placeholder="Enter sector"
                  disabled={actionLoading}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="cell">Cell</Label>
                <Input
                  id="cell"
                  value={currentEmployee?.cell || ''}
                  onChange={e => setCurrentEmployee(prev => prev ? { ...prev, cell: e.target.value } : null)}
                  placeholder="Enter cell"
                  disabled={actionLoading}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="village">Village</Label>
                <Input
                  id="village"
                  value={currentEmployee?.village || ''}
                  onChange={e => setCurrentEmployee(prev => prev ? { ...prev, village: e.target.value } : null)}
                  placeholder="Enter village"
                  disabled={actionLoading}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="role">Role</Label>
                <Select
                  value={currentEmployee?.role || 'staff'}
                  onValueChange={value => setCurrentEmployee(prev => prev ? { ...prev, role: value as 'admin' | 'staff' } : null)}
                  disabled={actionLoading}
                >
                  <SelectTrigger id="role">
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="staff">Staff</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="branch">Branch (Optional)</Label>
                <Select
                  value={currentEmployee?.branch || 'unassigned'}
                  onValueChange={value => setCurrentEmployee(prev => prev ? { ...prev, branch: value === 'unassigned' ? null : value } : null)}
                  disabled={actionLoading}
                >
                  <SelectTrigger id="branch">
                    <SelectValue placeholder="Select branch" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unassigned">Unassigned</SelectItem>
                    {branches.map(branch => (
                      <SelectItem key={branch.id} value={branch.id!}>
                        {branch.branchName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="isActive">Active Status</Label>
                <Checkbox
                  id="isActive"
                  checked={currentEmployee?.isActive || false}
                  onCheckedChange={checked => setCurrentEmployee(prev => prev ? { ...prev, isActive: Boolean(checked) } : null)}
                  disabled={actionLoading}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsUpdateDialogOpen(false)} disabled={actionLoading}>
                Cancel
              </Button>
              <Button onClick={handleUpdateEmployee} disabled={actionLoading}>
                {actionLoading && <LoadingSpinner size="sm" className="mr-2" />}
                Save Changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Assign Branch Dialog */}
        <Dialog open={isAssignBranchDialogOpen} onOpenChange={setIsAssignBranchDialogOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Assign Branch</DialogTitle>
              <DialogDescription>Select a branch to assign to {`${currentEmployee?.firstName} ${currentEmployee?.lastName}`}</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="branch">Branch</Label>
                <Select
                  value={assignBranchId || 'unassigned'}
                  onValueChange={value => setAssignBranchId(value === 'unassigned' ? null : value)}
                  disabled={actionLoading}
                >
                  <SelectTrigger id="branch">
                    <SelectValue placeholder="Select branch" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unassigned">Unassigned</SelectItem>
                    {branches.map(branch => (
                      <SelectItem key={branch.id} value={branch.id!}>
                        {branch.branchName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAssignBranchDialogOpen(false)} disabled={actionLoading}>
                Cancel
              </Button>
              <Button onClick={handleAssignBranch} disabled={actionLoading}>
                {actionLoading && <LoadingSpinner size="sm" className="mr-2" />}
                Assign Branch
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Details Dialog */}
        <Dialog open={isDetailsDialogOpen} onOpenChange={setIsDetailsDialogOpen}>
          <DialogContent className="sm:max-w-[425px] max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Employee Details</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              {currentEmployee && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="font-bold">Full Name</Label>
                      <p>{`${currentEmployee.firstName} ${currentEmployee.lastName}`}</p>
                    </div>
                    <div>
                      <Label className="font-bold">Username</Label>
                      <p>{currentEmployee.username}</p>
                    </div>
                    <div>
                      <Label className="font-bold">Email</Label>
                      <p>{currentEmployee.email}</p>
                    </div>
                    <div>
                      <Label className="font-bold">Phone</Label>
                      <p>{currentEmployee.phone}</p>
                    </div>
                    <div>
                      <Label className="font-bold">District</Label>
                      <p>{currentEmployee.district}</p>
                    </div>
                    <div>
                      <Label className="font-bold">Sector</Label>
                      <p>{currentEmployee.sector}</p>
                    </div>
                    <div>
                      <Label className="font-bold">Cell</Label>
                      <p>{currentEmployee.cell}</p>
                    </div>
                    <div>
                      <Label className="font-bold">Village</Label>
                      <p>{currentEmployee.village}</p>
                    </div>
                    <div>
                      <Label className="font-bold">Role</Label>
                      <p>{currentEmployee.role}</p>
                    </div>
                    <div>
                      <Label className="font-bold">Branch</Label>
                      <p>{currentEmployee.branch || 'Unassigned'}</p>
                    </div>
                    <div>
                      <Label className="font-bold">Active</Label>
                      <p>{currentEmployee.isActive ? 'Yes' : 'No'}</p>
                    </div>
                    <div>
                      <Label className="font-bold">Created At</Label>
                      <p>{formatDate(currentEmployee.createdAt || '')}</p>
                    </div>
                  </div>
                </>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDetailsDialogOpen(false)} disabled={actionLoading}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Single Confirm */}
        <Dialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirm Deletion</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete this employee? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDeleteConfirmOpen(false)} disabled={actionLoading}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleDeleteEmployee} disabled={actionLoading}>
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
              <DialogTitle>Confirm Deletion</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete {selectedEmployees.length} selected employee(s)? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDeleteSelectedConfirmOpen(false)} disabled={actionLoading}>
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

export default ManageEmployeesPage;