import React, { useState, useRef } from 'react';
import axios from 'axios';
import SEOHelmet from '@/components/SEOHelmet';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Search, PlusCircle, Eye, Edit, Trash2, UserPlus, ArrowLeft, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import LoadingSpinner from '@/components/LoadingSpinner';
import { useAuth } from '@/contexts/AuthContext';

// Define Employee interface based on userSchema
interface Employee {
  id: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  district: string;
  sector: string;
  cell: string;
  village: string;
  role: 'admin' | 'staff';
  branch: string | null; // Branch ID (ObjectId) or null
  branchName?: string; // Populated branch name for display
  isActive: boolean;
  createdAt: string;
}

// Define Branch interface based on branchSchema
interface Branch {
  id: string;
  branchName: string;
  district: string;
  sector: string;
  cell: string;
  village: string;
  createdAt: string;
}

// API base URL
const API_BASE_URL = import.meta.env.VITE_API_URL;
const EMPLOYEES_API_URL = `${API_BASE_URL}/users`;
const BRANCHES_API_URL = `${API_BASE_URL}/branches`;

const ManageEmployeesPage: React.FC = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isUpdateDialogOpen, setIsUpdateDialogOpen] = useState(false);
  const [isAssignBranchDialogOpen, setIsAssignBranchDialogOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [isDeleteSelectedConfirmOpen, setIsDeleteSelectedConfirmOpen] = useState(false);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const [currentEmployee, setCurrentEmployee] = useState<Employee | null>(null);
  const [newEmployee, setNewEmployee] = useState<Partial<Employee>>({
    username: '',
    email: '',
    firstName: '',
    lastName: '',
    phone: '',
    district: '',
    sector: '',
    cell: '',
    village: '',
    branch: null,
  });
  const [employeeToDelete, setEmployeeToDelete] = useState<string | null>(null);
  const [assignBranch, setAssignBranch] = useState<string | null>(null);
  const hasFetched = useRef(false);

  // Check if user is admin
  const isAdmin = user?.role === 'admin';

  // Fetch employees and branches for admins only
  const fetchData = async () => {
    if (!isAdmin) {
      setLoading(false);
      return;
    }
    setActionLoading(true);
    try {
      // Fetch branches
      const branchesResponse = await axios.get(BRANCHES_API_URL, { withCredentials: true });
      const branchesMapped = branchesResponse.data.data.branches.map((branch: any) => ({
        id: branch._id,
        branchName: branch.branchName,
        district: branch.district,
        sector: branch.sector,
        cell: branch.cell,
        village: branch.village,
        createdAt: branch.createdAt,
      }));
      setBranches(branchesMapped);

      // Fetch employees
      const employeesResponse = await axios.get(EMPLOYEES_API_URL, { withCredentials: true });
      const employeesMapped = employeesResponse.data.data.users.map((user: any) => ({
        id: user._id,
        username: user.username,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone,
        district: user.district,
        sector: user.sector,
        cell: user.cell,
        village: user.village,
        role: user.role,
        branch: user.branch?._id || null,
        branchName: user.branch?.branchName || null,
        isActive: user.isActive,
        createdAt: user.createdAt,
      }));
      setEmployees(employeesMapped);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: `Failed to fetch data: ${error.response?.data?.message || error.message}`,
        variant: 'destructive',
      });
    } finally {
      setActionLoading(false);
      setLoading(false);
    }
  };

  // Initial fetch on mount (using ref to avoid multiple calls)
  if (!hasFetched.current && isAdmin) {
    hasFetched.current = true;
    fetchData();
  }

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

  // Filter employees based on search term
  const filteredEmployees = employees.filter(
    e =>
      e.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.phone.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.district.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.sector.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.cell.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.village.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.role.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (e.branchName && e.branchName.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Handle create employee
  const handleCreateEmployee = async () => {
    if (
      !newEmployee.username ||
      !newEmployee.email ||
      !newEmployee.firstName ||
      !newEmployee.lastName ||
      !newEmployee.phone ||
      !newEmployee.district ||
      !newEmployee.sector ||
      !newEmployee.cell ||
      !newEmployee.village
    ) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in all required fields.',
        variant: 'destructive',
      });
      return;
    }
    try {
      setActionLoading(true);
      const response = await axios.post(
        EMPLOYEES_API_URL,
        {
          username: newEmployee.username,
          email: newEmployee.email,
          firstName: newEmployee.firstName,
          lastName: newEmployee.lastName,
          phone: newEmployee.phone,
          district: newEmployee.district,
          sector: newEmployee.sector,
          cell: newEmployee.cell,
          village: newEmployee.village,
          branch: newEmployee.branch === 'unassigned' ? null : newEmployee.branch,
        },
        { withCredentials: true }
      );
      const newEmployeeData: Employee = {
        id: response.data.data.user._id,
        username: response.data.data.user.username,
        email: response.data.data.user.email,
        firstName: response.data.data.user.firstName,
        lastName: response.data.data.user.lastName,
        phone: response.data.data.user.phone,
        district: response.data.data.user.district,
        sector: response.data.data.user.sector,
        cell: response.data.data.user.cell,
        village: response.data.data.user.village,
        role: response.data.data.user.role,
        branch: response.data.data.user.branch?._id || null,
        branchName: response.data.data.user.branch?.branchName || null,
        isActive: response.data.data.user.isActive,
        createdAt: response.data.data.user.createdAt,
      };
      setEmployees(prev => [...prev, newEmployeeData]);
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
        branch: null,
      });
      setIsCreateDialogOpen(false);
      toast({
        title: 'Success',
        description: response.data.message || 'Employee created successfully!',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: `Failed to create employee: ${error.response?.data?.message || error.message}`,
        variant: 'destructive',
      });
    } finally {
      setActionLoading(false);
    }
  };

  // Handle update employee
  const handleUpdateEmployee = async () => {
    if (
      !currentEmployee ||
      !currentEmployee.username ||
      !currentEmployee.email ||
      !currentEmployee.firstName ||
      !currentEmployee.lastName ||
      !currentEmployee.phone ||
      !currentEmployee.district ||
      !currentEmployee.sector ||
      !currentEmployee.cell ||
      !currentEmployee.village ||
      !currentEmployee.role
    ) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in all required fields.',
        variant: 'destructive',
      });
      return;
    }
    try {
      setActionLoading(true);
      const response = await axios.put(
        `${EMPLOYEES_API_URL}/${currentEmployee.id}`,
        {
          username: currentEmployee.username,
          email: currentEmployee.email,
          firstName: currentEmployee.firstName,
          lastName: currentEmployee.lastName,
          phone: currentEmployee.phone,
          district: currentEmployee.district,
          sector: currentEmployee.sector,
          cell: currentEmployee.cell,
          village: currentEmployee.village,
          role: currentEmployee.role,
          branch: currentEmployee.branch === 'unassigned' ? null : currentEmployee.branch,
          isActive: currentEmployee.isActive,
        },
        { withCredentials: true }
      );
      const updatedEmployee: Employee = {
        id: response.data.data.user._id,
        username: response.data.data.user.username,
        email: response.data.data.user.email,
        firstName: response.data.data.user.firstName,
        lastName: response.data.data.user.lastName,
        phone: response.data.data.user.phone,
        district: response.data.data.user.district,
        sector: response.data.data.user.sector,
        cell: response.data.data.user.cell,
        village: response.data.data.user.village,
        role: response.data.data.user.role,
        branch: response.data.data.user.branch?._id || null,
        branchName: response.data.data.user.branch?.branchName || null,
        isActive: response.data.data.user.isActive,
        createdAt: response.data.data.user.createdAt,
      };
      setEmployees(prev =>
        prev.map(emp => (emp.id === updatedEmployee.id ? updatedEmployee : emp))
      );
      setIsUpdateDialogOpen(false);
      setCurrentEmployee(null);
      toast({
        title: 'Success',
        description: response.data.message || 'Employee updated successfully!',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: `Failed to update employee: ${error.response?.data?.message || error.message}`,
        variant: 'destructive',
      });
    } finally {
      setActionLoading(false);
    }
  };

  // Handle assign branch
  const handleAssignBranch = async () => {
    if (!currentEmployee) return;
    try {
      setActionLoading(true);
      const response = await axios.put(
        `${EMPLOYEES_API_URL}/${currentEmployee.id}/${assignBranch === 'unassigned' ? 'unassign-branch' : 'assign-branch'}`,
        assignBranch === 'unassigned' ? {} : { branchId: assignBranch },
        { withCredentials: true }
      );
      const updatedEmployee: Employee = {
        id: response.data.data.user._id,
        username: response.data.data.user.username,
        email: response.data.data.user.email,
        firstName: response.data.data.user.firstName,
        lastName: response.data.data.user.lastName,
        phone: response.data.data.user.phone,
        district: response.data.data.user.district,
        sector: response.data.data.user.sector,
        cell: response.data.data.user.cell,
        village: response.data.data.user.village,
        role: response.data.data.user.role,
        branch: response.data.data.user.branch?._id || null,
        branchName: response.data.data.user.branch?.branchName || null,
        isActive: response.data.data.user.isActive,
        createdAt: response.data.data.user.createdAt,
      };
      setEmployees(prev =>
        prev.map(emp => (emp.id === updatedEmployee.id ? updatedEmployee : emp))
      );
      setIsAssignBranchDialogOpen(false);
      setCurrentEmployee(null);
      setAssignBranch(null);
      toast({
        title: 'Success',
        description: response.data.message || 'Branch assigned successfully!',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: `Failed to assign/unassign branch: ${error.response?.data?.message || error.message}`,
        variant: 'destructive',
      });
    } finally {
      setActionLoading(false);
    }
  };

  // Handle delete employee
  const handleDeleteEmployee = async () => {
    if (!employeeToDelete) return;
    try {
      setActionLoading(true);
      await axios.delete(`${EMPLOYEES_API_URL}/${employeeToDelete}`, { withCredentials: true });
      setEmployees(prev => prev.filter(emp => emp.id !== employeeToDelete));
      setSelectedEmployees(prev => prev.filter(id => id !== employeeToDelete));
      setEmployeeToDelete(null);
      setIsDeleteConfirmOpen(false);
      toast({
        title: 'Success',
        description: 'Employee permanently deleted!',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: `Failed to delete employee: ${error.response?.data?.message || error.message}`,
        variant: 'destructive',
      });
    } finally {
      setActionLoading(false);
    }
  };

  // Handle delete selected employees
  const handleDeleteSelected = () => {
    if (selectedEmployees.length === 0) {
      toast({
        title: 'No Employees Selected',
        description: 'Please select at least one employee to delete.',
        variant: 'destructive',
      });
      return;
    }
    setIsDeleteSelectedConfirmOpen(true);
  };

  // Confirm delete selected employees
  const handleConfirmDeleteSelected = async () => {
    try {
      setActionLoading(true);
      await Promise.all(
        selectedEmployees.map(id =>
          axios.delete(`${EMPLOYEES_API_URL}/${id}`, { withCredentials: true })
        )
      );
      setEmployees(prev => prev.filter(emp => !selectedEmployees.includes(emp.id)));
      setSelectedEmployees([]);
      setIsDeleteSelectedConfirmOpen(false);
      toast({
        title: 'Success',
        description: `${selectedEmployees.length} employee(s) permanently deleted!`,
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: `Failed to delete employees: ${error.response?.data?.message || error.message}`,
        variant: 'destructive',
      });
    } finally {
      setActionLoading(false);
    }
  };

  // Handle employee selection
  const handleSelectEmployee = (employeeId: string) => {
    setSelectedEmployees(prev =>
      prev.includes(employeeId)
        ? prev.filter(id => id !== employeeId)
        : [...prev, employeeId]
    );
  };

  // Open dialogs
  const openUpdateDialog = (employee: Employee) => {
    setCurrentEmployee(employee);
    setIsUpdateDialogOpen(true);
  };

  const openDetailsDialog = (employee: Employee) => {
    setCurrentEmployee(employee);
    setIsDetailsDialogOpen(true);
  };

  const openAssignBranchDialog = (employee: Employee) => {
    setCurrentEmployee(employee);
    setAssignBranch(employee.branch || 'unassigned');
    setIsAssignBranchDialogOpen(true);
  };

  const openDeleteConfirmDialog = (employeeId: string) => {
    setEmployeeToDelete(employeeId);
    setIsDeleteConfirmOpen(true);
  };

  // Render unauthorized card for staff users
  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-64px)] p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 dark:text-gray-400">
              You are not authorized to access this page. Only admins can manage employees.
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
        title="Employees"
        description="Manage employees, including creating, updating, deleting, and assigning to branches."
        canonical="https://opendash.pages.dev/employees"
      />
      <div className="space-y-4 p-4 md:p-6 bg-gray-50 dark:bg-gray-950 min-h-[calc(100vh-64px)]">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">Employees</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">Manage employees and assign them to branches</p>
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
            Employee
            </Button>
            <Button
              onClick={handleDeleteSelected}
              className="flex items-center gap-2 bg-red-600 text-white hover:bg-red-700"
              disabled={selectedEmployees.length === 0 || actionLoading}
            >
              {actionLoading ? (
                <LoadingSpinner size="sm" className="text-white mr-2" />
              ) : (
                <Trash2 size={18} />
              )}
              Selected
            </Button>
            <Button
              onClick={fetchData}
              className="flex items-center gap-2 bg-gray-600 text-white hover:bg-gray-700"
              disabled={actionLoading}
            >
              {actionLoading ? (
                <LoadingSpinner size="sm" className="text-white mr-2" />
              ) : (
                <RefreshCw size={18} />
              )}
              Data
            </Button>
          </div>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          <Input
            placeholder="Search by username, email, name, phone, location, role, or branch..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="pl-10 bg-gray-50 dark:bg-gray-700 dark:text-white border border-gray-300 dark:border-gray-600 focus:ring-blue-500 focus:border-blue-500 rounded-lg text-sm"
            disabled={actionLoading}
          />
        </div>
        <hr className="my-4 border-gray-200 dark:border-gray-700" />
        {filteredEmployees.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-gray-500">
            <p>No employees found. Create one to get started!</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]">
                    <Checkbox
                      checked={selectedEmployees.length === filteredEmployees.length && filteredEmployees.length > 0}
                      onCheckedChange={() => {
                        if (selectedEmployees.length === filteredEmployees.length) {
                          setSelectedEmployees([]);
                        } else {
                          setSelectedEmployees(filteredEmployees.map(e => e.id));
                        }
                      }}
                      disabled={actionLoading}
                    />
                  </TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead className="sm:hidden w-[50px]">View</TableHead>
                  <TableHead className="hidden sm:table-cell">Username</TableHead>
                  <TableHead className="hidden sm:table-cell">Email</TableHead>
                  <TableHead className="hidden sm:table-cell">Phone</TableHead>
                  <TableHead className="hidden sm:table-cell">District</TableHead>
                  <TableHead className="hidden sm:table-cell">Role</TableHead>
                  <TableHead className="hidden sm:table-cell">Branch</TableHead>
                  <TableHead className="hidden sm:table-cell">Active</TableHead>
                  <TableHead className="hidden sm:table-cell">Created At</TableHead>
                  <TableHead className="hidden sm:table-cell w-[150px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEmployees.map(employee => (
                  <TableRow key={employee.id}>
                    <TableCell onClick={e => e.stopPropagation()}>
                      <Checkbox
                        checked={selectedEmployees.includes(employee.id)}
                        onCheckedChange={() => handleSelectEmployee(employee.id)}
                        disabled={actionLoading}
                      />
                    </TableCell>
                    <TableCell className="font-medium">{`${employee.firstName} ${employee.lastName}`}</TableCell>
                    <TableCell className="sm:hidden" onClick={e => e.stopPropagation()}>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openDetailsDialog(employee)}
                        className="text-blue-600 hover:text-blue-700 hover:bg-blue-100 dark:text-blue-400 dark:hover:bg-blue-900"
                        title="View Details"
                        disabled={actionLoading}
                      >
                        <Eye size={14} />
                      </Button>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">{employee.username}</TableCell>
                    <TableCell className="hidden sm:table-cell">{employee.email}</TableCell>
                    <TableCell className="hidden sm:table-cell">{employee.phone}</TableCell>
                    <TableCell className="hidden sm:table-cell">{employee.district}</TableCell>
                    <TableCell className="hidden sm:table-cell">{employee.role}</TableCell>
                    <TableCell className="hidden sm:table-cell">{employee.branchName || 'Unassigned'}</TableCell>
                    <TableCell className="hidden sm:table-cell">{employee.isActive ? 'Yes' : 'No'}</TableCell>
                    <TableCell className="hidden sm:table-cell">{formatDate(employee.createdAt)}</TableCell>
                    <TableCell className="hidden sm:table-cell" onClick={e => e.stopPropagation()}>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openDetailsDialog(employee)}
                          className="text-blue-600 hover:text-blue-700 hover:bg-blue-100 dark:text-blue-400 dark:hover:bg-blue-900"
                          title="View Details"
                          disabled={actionLoading}
                        >
                          <Eye size={14} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openUpdateDialog(employee)}
                          className="text-blue-600 hover:text-blue-700 hover:bg-blue-100 dark:text-blue-400 dark:hover:bg-blue-900"
                          title="Edit"
                          disabled={actionLoading}
                        >
                          <Edit size={14} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openAssignBranchDialog(employee)}
                          className="text-blue-600 hover:text-blue-700 hover:bg-blue-100 dark:text-blue-400 dark:hover:bg-blue-900"
                          title="Assign Branch"
                          disabled={actionLoading}
                        >
                          <UserPlus size={14} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openDeleteConfirmDialog(employee.id)}
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
          <DialogContent className="sm:max-w-[360px] max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Employee</DialogTitle>
            </DialogHeader>
            <div className="grid gap-2 py-2 sm:grid-cols-2 sm:gap-x-3">
              <div className="grid gap-1">
                <Label htmlFor="username" className="text-sm">Username</Label>
                <Input
                  id="username"
                  value={newEmployee.username}
                  onChange={e => setNewEmployee(prev => ({ ...prev, username: e.target.value }))}
                  placeholder="e.g., johndoe"
                  required
                  className="text-sm h-8"
                  disabled={actionLoading}
                />
              </div>
              <div className="grid gap-1">
                <Label htmlFor="email" className="text-sm">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={newEmployee.email}
                  onChange={e => setNewEmployee(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="e.g., john.doe@example.com"
                  required
                  className="text-sm h-8"
                  disabled={actionLoading}
                />
              </div>
              <div className="grid gap-1">
                <Label htmlFor="firstName" className="text-sm">First Name</Label>
                <Input
                  id="firstName"
                  value={newEmployee.firstName}
                  onChange={e => setNewEmployee(prev => ({ ...prev, firstName: e.target.value }))}
                  placeholder="e.g., John"
                  required
                  className="text-sm h-8"
                  disabled={actionLoading}
                />
              </div>
              <div className="grid gap-1">
                <Label htmlFor="lastName" className="text-sm">Last Name</Label>
                <Input
                  id="lastName"
                  value={newEmployee.lastName}
                  onChange={e => setNewEmployee(prev => ({ ...prev, lastName: e.target.value }))}
                  placeholder="e.g., Doe"
                  required
                  className="text-sm h-8"
                  disabled={actionLoading}
                />
              </div>
              <div className="grid gap-1">
                <Label htmlFor="phone" className="text-sm">Phone</Label>
                <Input
                  id="phone"
                  value={newEmployee.phone}
                  onChange={e => setNewEmployee(prev => ({ ...prev, phone: e.target.value }))}
                  placeholder="e.g., +250123456789"
                  required
                  className="text-sm h-8"
                  disabled={actionLoading}
                />
              </div>
              <div className="grid gap-1">
                <Label htmlFor="district" className="text-sm">District</Label>
                <Input
                  id="district"
                  value={newEmployee.district}
                  onChange={e => setNewEmployee(prev => ({ ...prev, district: e.target.value }))}
                  placeholder="e.g., Kigali"
                  required
                  className="text-sm h-8"
                  disabled={actionLoading}
                />
              </div>
              <div className="grid gap-1">
                <Label htmlFor="sector" className="text-sm">Sector</Label>
                <Input
                  id="sector"
                  value={newEmployee.sector}
                  onChange={e => setNewEmployee(prev => ({ ...prev, sector: e.target.value }))}
                  placeholder="e.g., Kacyiru"
                  required
                  className="text-sm h-8"
                  disabled={actionLoading}
                />
              </div>
              <div className="grid gap-1">
                <Label htmlFor="cell" className="text-sm">Cell</Label>
                <Input
                  id="cell"
                  value={newEmployee.cell}
                  onChange={e => setNewEmployee(prev => ({ ...prev, cell: e.target.value }))}
                  placeholder="e.g., Kamutwa"
                  required
                  className="text-sm h-8"
                  disabled={actionLoading}
                />
              </div>
              <div className="grid gap-1">
                <Label htmlFor="village" className="text-sm">Village</Label>
                <Input
                  id="village"
                  value={newEmployee.village}
                  onChange={e => setNewEmployee(prev => ({ ...prev, village: e.target.value }))}
                  placeholder="e.g., Kibaza"
                  required
                  className="text-sm h-8"
                  disabled={actionLoading}
                />
              </div>
              <div className="grid gap-1">
                <Label htmlFor="branch" className="text-sm">Branch (Optional)</Label>
                <Select
                  value={newEmployee.branch || 'unassigned'}
                  onValueChange={value => setNewEmployee(prev => ({ ...prev, branch: value }))}
                  disabled={actionLoading}
                >
                  <SelectTrigger className="text-sm h-8">
                    <SelectValue placeholder="Select branch" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unassigned">Unassigned</SelectItem>
                    {branches.map(branch => (
                      <SelectItem key={branch.id} value={branch.id}>
                        {branch.branchName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter className="flex justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsCreateDialogOpen(false)}
                disabled={actionLoading}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                className="bg-blue-600 text-white hover:bg-blue-700"
                onClick={handleCreateEmployee}
                disabled={actionLoading}
              >
                {actionLoading && <LoadingSpinner size="sm" className="text-white mr-2" />}
                Create Employee
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        <Dialog open={isUpdateDialogOpen} onOpenChange={setIsUpdateDialogOpen}>
          <DialogContent className="sm:max-w-[360px] max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Update Employee</DialogTitle>
            </DialogHeader>
            <div className="grid gap-2 py-2 sm:grid-cols-2 sm:gap-x-3">
              <div className="grid gap-1">
                <Label htmlFor="username" className="text-sm">Username</Label>
                <Input
                  id="username"
                  value={currentEmployee?.username || ''}
                  onChange={e =>
                    setCurrentEmployee(prev => (prev ? { ...prev, username: e.target.value } : null))
                  }
                  placeholder="e.g., johndoe"
                  required
                  className="text-sm h-8"
                  disabled={actionLoading}
                />
              </div>
              <div className="grid gap-1">
                <Label htmlFor="email" className="text-sm">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={currentEmployee?.email || ''}
                  onChange={e =>
                    setCurrentEmployee(prev => (prev ? { ...prev, email: e.target.value } : null))
                  }
                  placeholder="e.g., john.doe@example.com"
                  required
                  className="text-sm h-8"
                  disabled={actionLoading}
                />
              </div>
              <div className="grid gap-1">
                <Label htmlFor="firstName" className="text-sm">First Name</Label>
                <Input
                  id="firstName"
                  value={currentEmployee?.firstName || ''}
                  onChange={e =>
                    setCurrentEmployee(prev => (prev ? { ...prev, firstName: e.target.value } : null))
                  }
                  placeholder="e.g., John"
                  required
                  className="text-sm h-8"
                  disabled={actionLoading}
                />
              </div>
              <div className="grid gap-1">
                <Label htmlFor="lastName" className="text-sm">Last Name</Label>
                <Input
                  id="lastName"
                  value={currentEmployee?.lastName || ''}
                  onChange={e =>
                    setCurrentEmployee(prev => (prev ? { ...prev, lastName: e.target.value } : null))
                  }
                  placeholder="e.g., Doe"
                  required
                  className="text-sm h-8"
                  disabled={actionLoading}
                />
              </div>
              <div className="grid gap-1">
                <Label htmlFor="phone" className="text-sm">Phone</Label>
                <Input
                  id="phone"
                  value={currentEmployee?.phone || ''}
                  onChange={e =>
                    setCurrentEmployee(prev => (prev ? { ...prev, phone: e.target.value } : null))
                  }
                  placeholder="e.g., +250123456789"
                  required
                  className="text-sm h-8"
                  disabled={actionLoading}
                />
              </div>
              <div className="grid gap-1">
                <Label htmlFor="district" className="text-sm">District</Label>
                <Input
                  id="district"
                  value={currentEmployee?.district || ''}
                  onChange={e =>
                    setCurrentEmployee(prev => (prev ? { ...prev, district: e.target.value } : null))
                  }
                  placeholder="e.g., Kigali"
                  required
                  className="text-sm h-8"
                  disabled={actionLoading}
                />
              </div>
              <div className="grid gap-1">
                <Label htmlFor="sector" className="text-sm">Sector</Label>
                <Input
                  id="sector"
                  value={currentEmployee?.sector || ''}
                  onChange={e =>
                    setCurrentEmployee(prev => (prev ? { ...prev, sector: e.target.value } : null))
                  }
                  placeholder="e.g., Kacyiru"
                  required
                  className="text-sm h-8"
                  disabled={actionLoading}
                />
              </div>
              <div className="grid gap-1">
                <Label htmlFor="cell" className="text-sm">Cell</Label>
                <Input
                  id="cell"
                  value={currentEmployee?.cell || ''}
                  onChange={e =>
                    setCurrentEmployee(prev => (prev ? { ...prev, cell: e.target.value } : null))
                  }
                  placeholder="e.g., Kamutwa"
                  required
                  className="text-sm h-8"
                  disabled={actionLoading}
                />
              </div>
              <div className="grid gap-1">
                <Label htmlFor="village" className="text-sm">Village</Label>
                <Input
                  id="village"
                  value={currentEmployee?.village || ''}
                  onChange={e =>
                    setCurrentEmployee(prev => (prev ? { ...prev, village: e.target.value } : null))
                  }
                  placeholder="e.g., Kibaza"
                  required
                  className="text-sm h-8"
                  disabled={actionLoading}
                />
              </div>
              <div className="grid gap-1">
                <Label htmlFor="role" className="text-sm">Role</Label>
                <Select
                  value={currentEmployee?.role || ''}
                  onValueChange={value =>
                    setCurrentEmployee(prev => (prev ? { ...prev, role: value } : null))
                  }
                  disabled={actionLoading}
                >
                  <SelectTrigger className="text-sm h-8">
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="staff">Staff</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1">
                <Label htmlFor="branch" className="text-sm">Branch (Optional)</Label>
                <Select
                  value={currentEmployee?.branch || 'unassigned'}
                  onValueChange={value =>
                    setCurrentEmployee(prev => (prev ? { ...prev, branch: value } : null))
                  }
                  disabled={actionLoading}
                >
                  <SelectTrigger className="text-sm h-8">
                    <SelectValue placeholder="Select branch" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unassigned">Unassigned</SelectItem>
                    {branches.map(branch => (
                      <SelectItem key={branch.id} value={branch.id}>
                        {branch.branchName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1">
                <Label htmlFor="isActive" className="text-sm">Active</Label>
                <Checkbox
                  id="isActive"
                  checked={currentEmployee?.isActive}
                  onCheckedChange={checked =>
                    setCurrentEmployee(prev => (prev ? { ...prev, isActive: !!checked } : null))
                  }
                  disabled={actionLoading}
                />
              </div>
            </div>
            <DialogFooter className="flex justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsUpdateDialogOpen(false)}
                disabled={actionLoading}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                className="bg-blue-600 text-white hover:bg-blue-700"
                onClick={handleUpdateEmployee}
                disabled={actionLoading}
              >
                {actionLoading && <LoadingSpinner size="sm" className="text-white mr-2" />}
                Save
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        <Dialog open={isAssignBranchDialogOpen} onOpenChange={setIsAssignBranchDialogOpen}>
          <DialogContent className="sm:max-w-[360px]">
            <DialogHeader>
              <DialogTitle>Assign Branch: {`${currentEmployee?.firstName} ${currentEmployee?.lastName}`}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-2 py-2">
              <div className="grid gap-1">
                <Label htmlFor="branch" className="text-sm">Branch</Label>
                <Select
                  value={assignBranch || 'unassigned'}
                  onValueChange={setAssignBranch}
                  disabled={actionLoading}
                >
                  <SelectTrigger className="text-sm h-8">
                    <SelectValue placeholder="Select branch" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unassigned">Unassigned</SelectItem>
                    {branches.map(branch => (
                      <SelectItem key={branch.id} value={branch.id}>
                        {branch.branchName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter className="flex justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsAssignBranchDialogOpen(false)}
                disabled={actionLoading}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                className="bg-blue-600 text-white hover:bg-blue-700"
                onClick={handleAssignBranch}
                disabled={actionLoading}
              >
                {actionLoading && <LoadingSpinner size="sm" className="text-white mr-2" />}
                Assign
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        <Dialog open={isDetailsDialogOpen} onOpenChange={setIsDetailsDialogOpen}>
          <DialogContent className="sm:max-w-[360px] max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Employee Details: {`${currentEmployee?.firstName} ${currentEmployee?.lastName}`}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-2 py-2">
              {currentEmployee && (
                <>
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    <span className="font-medium">Username:</span> {currentEmployee.username}
                  </p>
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    <span className="font-medium">Name:</span> {`${currentEmployee.firstName} ${currentEmployee.lastName}`}
                  </p>
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    <span className="font-medium">Email:</span> {currentEmployee.email}
                  </p>
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    <span className="font-medium">Phone:</span> {currentEmployee.phone}
                  </p>
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    <span className="font-medium">District:</span> {currentEmployee.district}
                  </p>
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    <span className="font-medium">Sector:</span> {currentEmployee.sector}
                  </p>
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    <span className="font-medium">Cell:</span> {currentEmployee.cell}
                  </p>
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    <span className="font-medium">Village:</span> {currentEmployee.village}
                  </p>
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    <span className="font-medium">Role:</span> {currentEmployee.role}
                  </p>
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    <span className="font-medium">Branch:</span> {currentEmployee.branchName || 'Unassigned'}
                  </p>
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    <span className="font-medium">Active:</span> {currentEmployee.isActive ? 'Yes' : 'No'}
                  </p>
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    <span className="font-medium">Created At:</span> {formatDate(currentEmployee.createdAt)}
                  </p>
                </>
              )}
            </div>
            <DialogFooter className="flex flex-col sm:flex-row justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
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
                    if (currentEmployee) openUpdateDialog(currentEmployee);
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
                    if (currentEmployee) openAssignBranchDialog(currentEmployee);
                  }}
                  className="text-blue-600 hover:text-blue-700 hover:bg-blue-100 dark:text-blue-400 dark:hover:bg-blue-900"
                  title="Assign Branch"
                  disabled={actionLoading}
                >
                  <UserPlus size={14} className="mr-1" />
                  Assign Branch
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setIsDetailsDialogOpen(false);
                    if (currentEmployee) openDeleteConfirmDialog(currentEmployee.id);
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
          <DialogContent className="sm:max-w-[360px]">
            <DialogHeader>
              <DialogTitle>Confirm Permanent Deletion</DialogTitle>
              <DialogDescription>
                Are you sure you want to permanently delete this employee? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="flex justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsDeleteConfirmOpen(false)}
                disabled={actionLoading}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                size="sm"
                className="bg-red-600 text-white hover:bg-red-700"
                onClick={handleDeleteEmployee}
                disabled={actionLoading}
              >
                {actionLoading && <LoadingSpinner size="sm" className="text-white mr-2" />}
                Delete
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        <Dialog open={isDeleteSelectedConfirmOpen} onOpenChange={setIsDeleteSelectedConfirmOpen}>
          <DialogContent className="sm:max-w-[360px]">
            <DialogHeader>
              <DialogTitle>Confirm Permanent Deletion of Selected Employees</DialogTitle>
              <DialogDescription>
                Are you sure you want to permanently delete {selectedEmployees.length} selected employee(s)? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="flex justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsDeleteSelectedConfirmOpen(false)}
                disabled={actionLoading}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                size="sm"
                className="bg-red-600 text-white hover:bg-red-700"
                onClick={handleConfirmDeleteSelected}
                disabled={actionLoading}
              >
                {actionLoading && <LoadingSpinner size="sm" className="text-white mr-2" />}
                Delete
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </>
  );
};

export default ManageEmployeesPage;