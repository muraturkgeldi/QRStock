
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import TopBar from '@/components/ui/TopBar';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Search, Users, Plus, Trash2, UserCog } from 'lucide-react';
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

import { useCollection, useUser } from '@/firebase';
import { useFirestore } from '@/firebase/provider';
import { doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { updateUserDisplayName } from '@/app/actions';


type FirestoreUser = {
  id: string;
  email: string;
  displayName?: string;
  role?: 'admin' | 'editor' | 'user';
  createdAt?: any;
};

function EditUserDialog({ user: initialUser, onUserUpdated }: { user: FirestoreUser, onUserUpdated: (uid: string, updatedData: Partial<FirestoreUser>) => void }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();
  
  const [displayName, setDisplayName] = useState(initialUser.displayName || '');
  const [role, setRole] = useState(initialUser.role || 'user');

  useEffect(() => {
    if (isOpen) {
      setDisplayName(initialUser.displayName || '');
      setRole(initialUser.role || 'user');
    }
  }, [isOpen, initialUser]);

  const handleSave = async () => {
    setIsSaving(true);
    toast({ title: 'Kaydediliyor...', description: 'Kullanıcı bilgileri güncelleniyor.' });
    try {
      await updateUserDisplayName(initialUser.id, displayName);
      onUserUpdated(initialUser.id, { displayName, role });

      toast({ title: 'Başarılı!', description: `${displayName} güncellendi.` });
      setIsOpen(false);
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Hata!', description: error.message });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => setIsOpen(true)}>
        <UserCog className="w-4 h-4" />
      </Button>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Kullanıcıyı Düzenle</DialogTitle>
          <DialogDescription>{initialUser.displayName || initialUser.email}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="displayName" className="text-right">Görünür Ad</Label>
            <Input id="displayName" name="displayName" value={displayName} onChange={(e) => setDisplayName(e.target.value)} className="col-span-3" />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="role" className="text-right">Rol</Label>
            <p className="col-span-3 text-sm text-muted-foreground">(Rol değiştirme yakında eklenecek)</p>
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


function DeleteDialog({ user, onConfirm, isSaving }: { user: FirestoreUser; onConfirm: () => void, isSaving: boolean; }) {
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

export default function ManageUsersPage() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const router = useRouter();

  // First, verify user's admin role
  const { user: currentUser, loading: userLoading } = useUser();
  const { data: userDocs, loading: usersLoading, error: usersError } = useCollection<FirestoreUser>('users');
  
  const [allUsers, setAllUsers] = useState<FirestoreUser[]>([]);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const isAdmin = currentUser?.role === 'admin';
  const isLoading = userLoading || usersLoading;

  useEffect(() => {
    if (!userLoading && !isAdmin) {
      toast({
        variant: 'destructive',
        title: 'Yetkisiz Erişim',
        description: 'Bu sayfayı görüntülemek için yönetici olmalısınız.',
      });
      router.push('/dashboard');
    }
  }, [userLoading, isAdmin, router, toast]);

  useEffect(() => {
    setAllUsers(userDocs);
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

  const handleUserUpdated = (uid: string, updatedData: Partial<FirestoreUser>) => {
    setAllUsers(prev => prev.map(u => u.id === uid ? { ...u, ...updatedData } : u));
  };
  
  const deleteUser = async (uid: string) => {
    if (!firestore) return;
    setIsDeleting(uid);
    try {
      // NOTE: This only deletes the Firestore document.
      // The Firebase Auth user is not deleted here.
      await deleteDoc(doc(firestore, 'users', uid));
      toast({ title: 'Başarılı!', description: 'Kullanıcı Firestore\'dan başarıyla silindi.' });
      setAllUsers(prev => prev.filter(u => u.id !== uid));
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
      (u.email || '').toLowerCase().includes(lower) ||
      (u.displayName || '').toLowerCase().includes(lower)
    );
  }, [allUsers, searchTerm]);
  
  const RoleBadge = ({ role }: { role?: FirestoreUser['role'] }) => {
    const roleText = role || 'user';
    const style = {
      admin: 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300',
      editor: 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300',
      user: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
    };
    return <Badge variant="outline" className={style[roleText]}>{roleText}</Badge>;
  };

  if (isLoading || !isAdmin) {
    return (
        <div className="flex flex-col h-dvh bg-app-bg">
            <TopBar title="Kullanıcıları Yönet" />
            <div className="p-4 text-center">
                {userLoading ? 'Yetki kontrol ediliyor...' : 'Yükleniyor...'}
            </div>
        </div>
    );
  }

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
                <CardDescription>Mevcut kullanıcıları düzenleyin veya silin.</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Button disabled>
                  <Plus className="mr-2 h-4 w-4" /> Yeni Kullanıcı (Yakında)
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col min-h-0">
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Ad veya e-posta ile filtrele..."
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
                    <div key={user.id} className="flex items-center gap-2 p-2 border-b last:border-b-0">
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold">{user.displayName || 'İsimsiz'}</p>
                          <RoleBadge role={user.role} />
                        </div>
                        <p className="text-xs text-muted-foreground">{user.email}</p>
                      </div>
                      <div className="flex items-center">
                        <EditUserDialog user={user} onUserUpdated={handleUserUpdated} />
                        <DeleteDialog user={user} onConfirm={() => deleteUser(user.id)} isSaving={isDeleting === user.id} />
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

    