import React, { useState, useEffect } from 'react';
import SEOHelmet from '@/components/SEOHelmet';
import LoadingSpinner from '@/components/LoadingSpinner';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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
import { Search, PlusCircle, Eye, Edit, Trash2, UserPlus, CloudOff, User, Package } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  getEmployees,
  createEmployee,
  updateEmployee,
  updateEmployeeEmail,
  assignBranchToEmployee,
  deleteEmployee,
  deleteMultipleEmployees,
  setEmployeeTransactionContext,
  subscribeToEmployees,
} from '@/functions/employees';
import { Employee, Branch } from '@/types/interface';
import { getBranches } from '@/functions/branch';

const ManageEmployeesPage: React.FC = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const { t } = useLanguage();

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
  const businessName = user?.businessName || 'SmartStock';

  // Set transaction logging context
  useEffect(() => {
    if (user && branches.length > 0) {
      setEmployeeTransactionContext({
        userId: user.id || '',
        userName: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email || 'Unknown User',
        userRole: user.role || 'staff',
        businessId: user.businessId || '',
        businessName: user.businessName || '',
      });
    }
  }, [user, branches]);

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

  // Fetch employees and branches with Real-time
  useEffect(() => {
    if (!businessId) {
      setLoading(false);
      return;
    }

    setLoading(true);

    // Initial branch load
    getBranches(businessId).then(branchList => {
      setBranches(branchList);
      const map = new Map<string, string>();
      map.set('unassigned', t('unassigned'));
      branchList.forEach(b => map.set(b.id!, b.branchName));
      setBranchMap(map);
    });

    const unsubscribe = subscribeToEmployees((allEmps) => {
      // Filter for specific business
      const myEmployees = allEmps.filter(e => e.businessId === businessId);
      setEmployees(myEmployees);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [businessId, toast, t]);

  const getBranchName = (id: string | null) => branchMap.get(id || 'unassigned') || t('unassigned');

  const filteredEmployees = employees.filter(emp =>
    `${emp.firstName} ${emp.lastName} ${emp.email} ${emp.phone} ${getBranchName(emp.branch)} ${emp.role}`
      .toLowerCase()
      .includes(searchTerm.toLowerCase())
  );

  // Selection handlers
  const handleSelect = (employeeId: string) => {
    setSelectedEmployees(prev =>
      prev.includes(employeeId)
        ? prev.filter(id => id !== employeeId)
        : [...prev, employeeId]
    );
  };

  const selectAll = (checked: boolean) => {
    if (checked) {
      setSelectedEmployees(filteredEmployees.map(emp => emp.id!).filter(Boolean));
    } else {
      setSelectedEmployees([]);
    }
  };

  // Action handlers
  const handleCreateEmployee = async () => {
    if (!newEmployee.email || !newEmployee.firstName || !newEmployee.lastName) {
      toast({ title: t('error'), description: t('required_fields_error'), variant: 'destructive' });
      return;
    }

    setActionLoading(true);
    const result = await createEmployee({
      ...newEmployee,
      businessId: businessId!,
      businessName,
    });

    if (result) {
      setEmployees(prev => [...prev, result]);
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
    setActionLoading(false);
  };

  const handleUpdateEmployee = async () => {
    if (!currentEmployee) return;

    setActionLoading(true);

    // Check if email changed
    const originalEmail = employees.find(e => e.id === currentEmployee.id)?.email;
    const emailChanged = originalEmail !== currentEmployee.email;

    let success = true;

    if (emailChanged) {
      success = await updateEmployeeEmail(currentEmployee.id!, currentEmployee.email);
      if (!success) {
        setActionLoading(false);
        return;
      }
    }

    // Update other fields
    if (success) {
      success = await updateEmployee(currentEmployee.id!, {
        ...currentEmployee,
        username: currentEmployee.email, // Keep username in sync
      });

      if (success) {
        setEmployees(prev => prev.map(e => (e.id === currentEmployee.id ? currentEmployee : e)));
        setIsUpdateDialogOpen(false);
        toast({ title: t('success'), description: t('employee_updated_success') });
      }
    }

    setActionLoading(false);
  };

  const handleAssignBranch = async () => {
    if (!currentEmployee || assignBranchId === undefined) return;
    setActionLoading(true);
    const branchName = getBranchName(assignBranchId);
    const success = await assignBranchToEmployee(currentEmployee.id!, assignBranchId, branchName);
    if (success) {
      setEmployees(prev =>
        prev.map(e => (e.id === currentEmployee.id ? { ...e, branch: assignBranchId } : e))
      );
      setIsAssignBranchDialogOpen(false);
    }
    setActionLoading(false);
  };

  const handleDeleteEmployee = async () => {
    if (!employeeToDelete) return;
    setActionLoading(true);
    const success = await deleteEmployee(employeeToDelete);
    if (success) {
      setEmployees(prev => prev.filter(e => e.id !== employeeToDelete));
      setIsDeleteConfirmOpen(false);
    }
    setActionLoading(false);
  };

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

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  // Staff view (read-only)
  if (!isAdmin) {
    return (
      <>
        <SEOHelmet title={t('employees')} />
        <div className="space-y-6 p-4 md:p-6 bg-background min-h-[calc(100vh-64px)]">
          <h1 className="text-3xl font-bold text-foreground">{t('employees')}</h1>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('name')}</TableHead>
                  <TableHead>{t('email')}</TableHead>
                  <TableHead>{t('phone')}</TableHead>
                  <TableHead>{t('role')}</TableHead>
                  <TableHead>{t('branch')}</TableHead>
                  <TableHead>{t('active')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEmployees.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      {t('no_employees_found')}
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

  // Admin full management view
  return (
    <>
      <SEOHelmet title={t('manage_employees')} />
      <div className="space-y-6 p-4 md:p-6 bg-background min-h-[calc(100vh-64px)]">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold">{t('manage_employees')}</h1>
            <p className="text-muted-foreground">{t('manage_employees_desc')}</p>
            {!isOnline && (
              <p className="text-orange-600 text-sm mt-2 flex items-center gap-2">
                <CloudOff className="h-4 w-4" />
                {t('offline_warning')}
              </p>
            )}
          </div>
          <div className="flex gap-3">
            <Button onClick={() => setIsCreateDialogOpen(true)} disabled={actionLoading}>
              <PlusCircle className="mr-2 h-4 w-4" />
              {t('add_employee')}
            </Button>
            <Button
              variant="destructive"
              onClick={() => setIsDeleteSelectedConfirmOpen(true)}
              disabled={selectedEmployees.length === 0 || actionLoading}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              {t('delete_selected')} ({selectedEmployees.length})
            </Button>
          </div>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={20} />
          <Input
            placeholder={t('search_employees')}
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
                <TableHead className="w-12">
                  <Checkbox
                    checked={selectedEmployees.length === filteredEmployees.length && filteredEmployees.length > 0}
                    onCheckedChange={(checked) => selectAll(!!checked)}
                  />
                </TableHead>
                <TableHead className="w-16">{t('photo')}</TableHead>
                <TableHead>{t('name')}</TableHead>
                <TableHead>{t('email')}</TableHead>
                <TableHead>{t('phone')}</TableHead>
                <TableHead>{t('district')}</TableHead>
                <TableHead>{t('role')}</TableHead>
                <TableHead>{t('branch')}</TableHead>
                <TableHead>{t('active')}</TableHead>
                <TableHead>{t('created_at')}</TableHead>
                <TableHead className="text-right">{t('actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredEmployees.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={11} className="h-64 text-center text-muted-foreground">
                    <div className="flex flex-col items-center justify-center space-y-3">
                      <Package className="h-12 w-12 opacity-20" />
                      <p className="text-lg font-medium">{t('no_employees_found')}</p>
                    </div>
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
                    <TableCell>
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={emp.profileImage || emp.imagephoto || ''} alt={`${emp.firstName} ${emp.lastName}`} />
                        <AvatarFallback>
                          <User className="h-5 w-5 text-muted-foreground" />
                        </AvatarFallback>
                      </Avatar>
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
                        <Button size="sm" variant="ghost" className="hover:text-primary transition-colors" onClick={() => { setCurrentEmployee(emp); setIsDetailsDialogOpen(true); }}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="ghost" className="hover:text-primary transition-colors" onClick={() => { setCurrentEmployee(emp); setIsUpdateDialogOpen(true); }}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="ghost" className="hover:text-primary transition-colors" onClick={() => { setCurrentEmployee(emp); setAssignBranchId(emp.branch); setIsAssignBranchDialogOpen(true); }}>
                          <UserPlus className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive/80 transition-colors" onClick={() => { setEmployeeToDelete(emp.id!); setIsDeleteConfirmOpen(true); }}>
                          <Trash2 className="h-4 w-4" />
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
              <DialogTitle>{t('create_new_employee')}</DialogTitle>
              <DialogDescription>
                {t('default_password_msg')} <strong>1234567</strong>
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="create-email">{t('email')} *</Label>
                <Input
                  id="create-email"
                  type="email"
                  value={newEmployee.email}
                  onChange={e => setNewEmployee(p => ({ ...p, email: e.target.value }))}
                  placeholder={t('enter_email')}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="create-firstName">{t('first_name')} *</Label>
                <Input
                  id="create-firstName"
                  value={newEmployee.firstName}
                  onChange={e => setNewEmployee(p => ({ ...p, firstName: e.target.value }))}
                  placeholder={t('enter_placeholder')}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="create-lastName">{t('last_name')} *</Label>
                <Input
                  id="create-lastName"
                  value={newEmployee.lastName}
                  onChange={e => setNewEmployee(p => ({ ...p, lastName: e.target.value }))}
                  placeholder={t('enter_placeholder')}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="create-phone">{t('phone')}</Label>
                <Input
                  id="create-phone"
                  type="tel"
                  value={newEmployee.phone}
                  onChange={e => setNewEmployee(p => ({ ...p, phone: e.target.value }))}
                  placeholder={t('enter_placeholder')}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="create-district">{t('district')}</Label>
                <Input
                  id="create-district"
                  value={newEmployee.district}
                  onChange={e => setNewEmployee(p => ({ ...p, district: e.target.value }))}
                  placeholder={t('enter_placeholder')}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="create-sector">{t('sector')}</Label>
                <Input
                  id="create-sector"
                  value={newEmployee.sector}
                  onChange={e => setNewEmployee(p => ({ ...p, sector: e.target.value }))}
                  placeholder={t('enter_placeholder')}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="create-cell">{t('cell')}</Label>
                <Input
                  id="create-cell"
                  value={newEmployee.cell}
                  onChange={e => setNewEmployee(p => ({ ...p, cell: e.target.value }))}
                  placeholder={t('enter_placeholder')}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="create-village">{t('village')}</Label>
                <Input
                  id="create-village"
                  value={newEmployee.village}
                  onChange={e => setNewEmployee(p => ({ ...p, village: e.target.value }))}
                  placeholder={t('enter_placeholder')}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="create-gender">{t('gender')}</Label>
                <Select
                  value={newEmployee.gender || ''}
                  onValueChange={v => setNewEmployee(p => ({ ...p, gender: v as 'male' | 'female' }))}
                >
                  <SelectTrigger id="create-gender">
                    <SelectValue placeholder={t('select_gender')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">{t('male')}</SelectItem>
                    <SelectItem value="female">{t('female')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="create-branch">{t('branch_optional')}</Label>
                <Select
                  value={newEmployee.branch || 'unassigned'}
                  onValueChange={v => setNewEmployee(p => ({ ...p, branch: v === 'unassigned' ? null : v }))}
                >
                  <SelectTrigger id="create-branch">
                    <SelectValue placeholder={t('select_branch')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unassigned">{t('unassigned')}</SelectItem>
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
                {t('cancel')}
              </Button>
              <Button onClick={handleCreateEmployee} disabled={actionLoading}>
                {actionLoading ? t('creating') : t('create_employee')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Update Dialog - Email now editable */}
        <Dialog open={isUpdateDialogOpen} onOpenChange={setIsUpdateDialogOpen}>
          <DialogContent className="max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{t('update_employee')}</DialogTitle>
            </DialogHeader>
            {currentEmployee && (
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label>{t('email')} *</Label>
                  <Input
                    type="email"
                    value={currentEmployee.email}
                    onChange={e => setCurrentEmployee(prev => prev ? { ...prev, email: e.target.value.trim().toLowerCase() } : null)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>{t('first_name')}</Label>
                  <Input
                    value={currentEmployee.firstName}
                    onChange={e => setCurrentEmployee(prev => prev ? { ...prev, firstName: e.target.value } : null)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>{t('last_name')}</Label>
                  <Input
                    value={currentEmployee.lastName}
                    onChange={e => setCurrentEmployee(prev => prev ? { ...prev, lastName: e.target.value } : null)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>{t('phone')}</Label>
                  <Input
                    value={currentEmployee.phone || ''}
                    onChange={e => setCurrentEmployee(prev => prev ? { ...prev, phone: e.target.value } : null)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>{t('district')}</Label>
                  <Input
                    value={currentEmployee.district || ''}
                    onChange={e => setCurrentEmployee(prev => prev ? { ...prev, district: e.target.value } : null)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>{t('sector')}</Label>
                  <Input
                    value={currentEmployee.sector || ''}
                    onChange={e => setCurrentEmployee(prev => prev ? { ...prev, sector: e.target.value } : null)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>{t('cell')}</Label>
                  <Input
                    value={currentEmployee.cell || ''}
                    onChange={e => setCurrentEmployee(prev => prev ? { ...prev, cell: e.target.value } : null)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>{t('village')}</Label>
                  <Input
                    value={currentEmployee.village || ''}
                    onChange={e => setCurrentEmployee(prev => prev ? { ...prev, village: e.target.value } : null)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>{t('role')}</Label>
                  <Select
                    value={currentEmployee.role}
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
                  <Label>{t('branch')}</Label>
                  <Select
                    value={currentEmployee.branch || 'unassigned'}
                    onValueChange={v => setCurrentEmployee(prev => prev ? { ...prev, branch: v === 'unassigned' ? null : v } : null)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unassigned">{t('unassigned')}</SelectItem>
                      {branches.map(b => (
                        <SelectItem key={b.id} value={b.id!}>
                          {b.branchName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2 items-center">
                  <Label>{t('active')}</Label>
                  <Checkbox
                    checked={currentEmployee.isActive}
                    onCheckedChange={c => setCurrentEmployee(prev => prev ? { ...prev, isActive: !!c } : null)}
                  />
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsUpdateDialogOpen(false)}>
                {t('cancel')}
              </Button>
              <Button onClick={handleUpdateEmployee} disabled={actionLoading}>
                {actionLoading ? t('saving') : t('save_changes')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Assign Branch Dialog */}
        <Dialog open={isAssignBranchDialogOpen} onOpenChange={setIsAssignBranchDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t('assign_branch')}</DialogTitle>
              <DialogDescription>
                {t('select_branch_for')} {currentEmployee ? `${currentEmployee.firstName} ${currentEmployee.lastName}` : ''}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <Label>{t('branch')}</Label>
              <Select
                value={assignBranchId || 'unassigned'}
                onValueChange={v => setAssignBranchId(v === 'unassigned' ? null : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('select_branch')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unassigned">{t('unassigned')}</SelectItem>
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
                {t('cancel')}
              </Button>
              <Button onClick={handleAssignBranch} disabled={actionLoading}>
                {actionLoading ? t('assigning') : t('assign_branch')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={isDetailsDialogOpen} onOpenChange={setIsDetailsDialogOpen}>
          <DialogContent className="max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{t('employee_details')}</DialogTitle>
            </DialogHeader>
            {currentEmployee && (
              <div className="space-y-4 py-4">
                <div className="flex items-center gap-4">
                  <Avatar className="h-16 w-16">
                    <AvatarImage src={currentEmployee.profileImage || currentEmployee.imagephoto || ''} />
                    <AvatarFallback><User className="h-8 w-8" /></AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-xl font-bold">{currentEmployee.firstName} {currentEmployee.lastName}</p>
                    <p className="text-muted-foreground">{currentEmployee.email}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 mt-4">
                  <div><strong>{t('phone')}:</strong> {currentEmployee.phone || '-'}</div>
                  <div><strong>{t('role')}:</strong> {currentEmployee.role}</div>
                  <div><strong>{t('district')}:</strong> {currentEmployee.district || '-'}</div>
                  <div><strong>{t('sector')}:</strong> {currentEmployee.sector || '-'}</div>
                  <div><strong>{t('cell')}:</strong> {currentEmployee.cell || '-'}</div>
                  <div><strong>{t('village')}:</strong> {currentEmployee.village || '-'}</div>
                  <div><strong>{t('gender')}:</strong> {currentEmployee.gender || '-'}</div>
                  <div><strong>{t('branch')}:</strong> {getBranchName(currentEmployee.branch)}</div>
                  <div><strong>{t('active')}:</strong> {currentEmployee.isActive ? 'Yes' : 'No'}</div>
                  <div><strong>{t('created_at')}:</strong> {currentEmployee.createdAt ? new Date(currentEmployee.createdAt).toLocaleDateString() : '-'}</div>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDetailsDialogOpen(false)}>
                {t('close')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t('delete_employee_q')}</DialogTitle>
              <DialogDescription>
                {t('delete_employee_warning')}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDeleteConfirmOpen(false)}>
                {t('cancel')}
              </Button>
              <Button variant="destructive" onClick={handleDeleteEmployee} disabled={actionLoading}>
                {actionLoading ? t('deleting') : t('delete')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={isDeleteSelectedConfirmOpen} onOpenChange={setIsDeleteSelectedConfirmOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t('delete_selected_employees_q')}</DialogTitle>
              <DialogDescription>
                {t('delete_multiple_employees_warning').replace('{count}', selectedEmployees.length.toString())}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDeleteSelectedConfirmOpen(false)}>
                {t('cancel')}
              </Button>
              <Button variant="destructive" onClick={handleDeleteSelected} disabled={actionLoading}>
                {actionLoading ? t('deleting') : t('delete_selected')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </>
  );
};

export default ManageEmployeesPage;