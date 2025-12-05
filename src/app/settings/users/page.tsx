'use client';

import { useState, useEffect, useMemo } from 'react';
import TopBar from '@/components/ui/TopBar';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Search, Users, Plus, Trash2, UserCog, Download } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

import { useCollection } from '@/firebase/firestore/use-collection';
import { useFirestore } from '@/firebase/provider';
import { doc, updateDoc, deleteDoc } from 'firebase/firestore';

// Firestore'daki users/{uid} dokümanının beklenen yapısı
type FirestoreUser = {
  id: string; // useCollection id ekliyor
  email: string;
  displayName?: string;
  role?: 'admin' | 'editor' | 'user';
  firstName?: string;
  lastName?: string;
  department?: string;
  title?: string;
  createdAt?: string;
};

// Arayüzde kullanılacak birleşik tip
type Staff = {
  uid: string;
  email: string;
  displayName: string;
  role: 'admin' | 'editor' | 'user';
  disabled: boolean;
  profile: {
    firstName: string;
    lastName: string;
    department: string;
    title: string;
  };
  metadata: {
    creationTime: string;
    lastSignInTime: string;
  }
};

// --- Bileşenler ---

// Kullanıcı Ekleme Diyaloğu (şimdilik devre dışı)
function AddUserDialog({ onUserAdded }: { onUserAdded: (newUser: Staff) => void }) {
  return (
    <Button disabled>
      <Plus className="mr-2 h-4 w-4" /> Yeni Kullanıcı
    </Button>
  );
}

// Kullanıcı Silme Onay Diyaloğu
function DeleteDialog({ user, onConfirm, isSaving }: { user: Staff; onConfirm: () => void, isSaving: boolean; }) {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
      <Button
        variant="ghost"
        size="icon"
        className="h-9 w-9 text-destructive hover:text-destructive hover:bg-destructive/10"
        onClick={() => setIsOpen(true)}
        disabled={isSaving}
      >
        <Trash2 className="w-4 h-4" />
      </Button>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Kullanıcıyı Silmek İstediğinize Emin misiniz?</AlertDialogTitle>
          <AlertDialogDescription>
            Bu işlem geri alınamaz. <strong>{user.displayName || user.email}</strong> kullanıcısı sistemden kalıcı olarak silinecektir.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Vazgeç</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className="bg-destructive hover:bg-destructive/90"
            disabled={isSaving}
          >
            {isSaving ? "Siliniyor..." : "Evet, Sil"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// Kullanıcı Düzenleme Diyaloğu (Firestore üzerinden PATCH)
function EditUserDialog({ user, onUserUpdated }: { user: Staff, onUserUpdated: (uid: string, updatedUser: Staff) => void }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();
  const firestore = useFirestore();

  const [formData, setFormData] = useState({
    displayName: user.displayName || '',
    role: user.role || 'user',
    firstName: user.profile?.firstName || '',
    lastName: user.profile?.lastName || '',
    department: user.profile?.department || '',
    title: user.profile?.title || '',
  });

  useEffect(() => {
    setFormData({
      displayName: user.displayName || '',
      role: user.role || 'user',
      firstName: user.profile?.firstName || '',
      lastName: user.profile?.lastName || '',
      department: user.profile?.department || '',
      title: user.profile?.title || '',
    });
  }, [user, isOpen]);

  const handleSave = async () => {
    if (!firestore) return;
    setIsSaving(true);
    toast({ title: 'Kaydediliyor...', description: 'Kullanıcı bilgileri güncelleniyor.' });
    try {
      // Firestore users/{uid} dokümanını güncelle
      await updateDoc(doc(firestore, 'users', user.uid), {
        displayName: formData.displayName,
        role: formData.role,
        firstName: formData.firstName,
        lastName: formData.lastName,
        department: formData.department,
        title: formData.title,
      });

      toast({ title: 'Başarılı!', description: `${user.displayName} güncellendi.` });

      const updatedUser: Staff = {
        ...user,
        displayName: formData.displayName,
        role: formData.role as Staff['role'],
        profile: {
          ...user.profile,
          firstName: formData.firstName,
          lastName: formData.lastName,
          department: formData.department,
          title: formData.title,
        },
      };

      onUserUpdated(user.uid, updatedUser);
      setIsOpen(false);
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Hata!', description: error.message });
    } finally {
      setIsSaving(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => setIsOpen(true)}>
        <UserCog className="w-4 h-4" />
      </Button>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Kullanıcıyı Düzenle</DialogTitle>
          <DialogDescription>{user.displayName || user.email}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="displayName" className="text-right">Görünür Ad</Label>
            <Input id="displayName" name="displayName" value={formData.displayName} onChange={handleChange} className="col-span-3" />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="firstName" className="text-right">İsim</Label>
            <Input id="firstName" name="firstName" value={formData.firstName} onChange={handleChange} className="col-span-3" />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="lastName" className="text-right">Soyisim</Label>
            <Input id="lastName" name="lastName" value={formData.lastName} onChange={handleChange} className="col-span-3" />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="title" className="text-right">Unvan</Label>
            <Input id="title" name="title" value={formData.title} onChange={handleChange} className="col-span-3" />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="department" className="text-right">Departman</Label>
            <Input id="department" name="department" value={formData.department} onChange={handleChange} className="col-span-3" />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="role" className="text-right">Rol</Label>
            <select
              name="role"
              id="role"
              value={formData.role}
              onChange={(e) => setFormData(prev => ({ ...prev, role: e.target.value as Staff['role'] }))}
              className="col-span-3 flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="user">Kullanıcı</option>
              <option value="editor">Editör</option>
              <option value="admin">Yönetici</option>
            </select>
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild><Button type="button" variant="secondary">İptal</Button></DialogClose>
          <Button onClick={handleSave} disabled={isSaving}>{isSaving ? 'Kaydediliyor...' : 'Değişiklikleri Kaydet'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Ana Sayfa Bileşeni
export default function ManageUsersPage() {
  const firestore = useFirestore();
  const { toast } = useToast();

  const { data: userDocs, loading: usersLoading, error: usersError } = useCollection<FirestoreUser>('users');

  const [allUsers, setAllUsers] = useState<Staff[]>([]);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Firestore user dokümanlarını Staff tipine map et
  useEffect(() => {
    const mapped: Staff[] = userDocs.map((u) => ({
      uid: u.id,
      email: u.email || '',
      displayName: u.displayName || u.email || 'İsimsiz Kullanıcı',
      role: (u.role || 'user') as Staff['role'],
      disabled: false,
      profile: {
        firstName: u.firstName || '',
        lastName: u.lastName || '',
        department: u.department || '',
        title: u.title || '',
      },
      metadata: {
        creationTime: u.createdAt || '',
        lastSignInTime: '',
      },
    }));
    setAllUsers(mapped);
  }, [userDocs]);

  useEffect(() => {
    if (usersError) {
      toast({
        variant: 'destructive',
        title: 'Hata!',
        description: `Kullanıcılar getirilemedi: ${usersError.message}`,
      });
    }
  }, [usersError, toast]);

  const handleUserUpdated = (uid: string, updatedUser: Staff) => {
    setAllUsers(prev => prev.map(u => u.uid === uid ? updatedUser : u));
  };

  const handleUserDeleted = (uid: string) => {
    setAllUsers(prev => prev.filter(u => u.uid !== uid));
  };

  const deleteUser = async (uid: string) => {
    if (!firestore) return;
    setIsDeleting(uid);
    try {
      await deleteDoc(doc(firestore, 'users', uid));
      toast({ title: 'Başarılı!', description: 'Kullanıcı başarıyla silindi.' });
      handleUserDeleted(uid);
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Hata!', description: error.message });
    } finally {
      setIsDeleting(null);
    }
  };

  const filteredUsers = useMemo(() => {
    if (!searchTerm) return allUsers;
    const lower = searchTerm.toLowerCase();
    return allUsers.filter(u =>
      u.email.toLowerCase().includes(lower) ||
      u.displayName.toLowerCase().includes(lower) ||
      (u.profile?.firstName && u.profile.firstName.toLowerCase().includes(lower)) ||
      (u.profile?.lastName && u.profile.lastName.toLowerCase().includes(lower))
    );
  }, [allUsers, searchTerm]);
  
  const RoleBadge = ({ role }: { role: Staff['role'] }) => {
    const style = {
      admin: 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300',
      editor: 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300',
      user: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
    };
    return <Badge variant="outline" className={style[role] || style.user}>{role}</Badge>;
  };

  const isLoading = usersLoading;

  return (
    <div className="flex flex-col h-dvh bg-app-bg">
      <TopBar title="Kullanıcıları Yönet" />
      <div className="p-4 space-y-4 flex-1 flex flex-col">
        <Card className="flex-1 flex flex-col">
          <CardHeader>
            <div className="flex justify-between items-start flex-wrap gap-2">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5" /> Sistem Kullanıcıları
                </CardTitle>
                <CardDescription>Mevcut kullanıcıları düzenleyin, silin veya yeni kullanıcılar ekleyin.</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <AddUserDialog onUserAdded={(newUser) => setAllUsers(prev => [newUser, ...prev])} />
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col min-h-0">
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Ad, soyad, e-posta ile filtrele..."
                className="w-full pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <ScrollArea className="flex-1 border rounded-md">
              <div className="p-1">
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16 w-full my-1" />)
                ) : filteredUsers.length > 0 ? (
                  filteredUsers.map(user => (
                    <div key={user.uid} className="flex items-center gap-2 p-2 border-b last:border-b-0">
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold">{user.displayName}</p>
                          <RoleBadge role={user.role} />
                        </div>
                        <p className="text-xs text-muted-foreground">{user.email}</p>
                      </div>
                      <div className="flex items-center">
                        <EditUserDialog user={user} onUserUpdated={handleUserUpdated} />
                        <DeleteDialog user={user} onConfirm={() => deleteUser(user.uid)} isSaving={isDeleting === user.uid} />
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="p-4 text-center text-muted-foreground">Kullanıcı bulunamadı.</p>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
