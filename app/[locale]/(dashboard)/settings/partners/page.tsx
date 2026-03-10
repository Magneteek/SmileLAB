'use client';

/**
 * External Partners Settings Page
 *
 * Manage milling centres and design partners used in production tracking.
 * ADMIN and TECHNICIAN can create/edit; only ADMIN can delete.
 */

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { PartnerType } from '@prisma/client';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Plus, Edit, Trash2, Loader2, Factory, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useLocale } from 'next-intl';

interface ExternalPartner {
  id: string;
  name: string;
  type: PartnerType;
  email: string | null;
  phone: string | null;
  notes: string | null;
  isActive: boolean;
  createdAt: string;
}

const partnerSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200),
  type: z.enum(['DESIGN', 'MILLING', 'BOTH']),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  phone: z.string().max(50).optional(),
  notes: z.string().max(2000).optional(),
  isActive: z.boolean(),
});

type PartnerFormValues = z.infer<typeof partnerSchema>;

const TYPE_LABELS: Record<PartnerType, string> = {
  DESIGN: 'Design / CAD',
  MILLING: 'Milling / Printing',
  BOTH: 'Design + Milling',
};

const TYPE_COLORS: Record<PartnerType, string> = {
  DESIGN: 'bg-blue-100 text-blue-800',
  MILLING: 'bg-purple-100 text-purple-800',
  BOTH: 'bg-teal-100 text-teal-800',
};

export default function PartnersSettingsPage() {
  const locale = useLocale();
  const { toast } = useToast();

  const [partners, setPartners] = useState<ExternalPartner[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPartner, setEditingPartner] = useState<ExternalPartner | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ExternalPartner | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const form = useForm<PartnerFormValues>({
    resolver: zodResolver(partnerSchema),
    defaultValues: {
      name: '',
      type: 'MILLING',
      email: '',
      phone: '',
      notes: '',
      isActive: true,
    },
  });

  const fetchPartners = async () => {
    try {
      const res = await fetch('/api/partners');
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setPartners(data.data);
    } catch {
      toast({ title: 'Error', description: 'Failed to load partners', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPartners();
  }, []);

  const openCreate = () => {
    setEditingPartner(null);
    form.reset({ name: '', type: 'MILLING', email: '', phone: '', notes: '', isActive: true });
    setDialogOpen(true);
  };

  const openEdit = (partner: ExternalPartner) => {
    setEditingPartner(partner);
    form.reset({
      name: partner.name,
      type: partner.type,
      email: partner.email ?? '',
      phone: partner.phone ?? '',
      notes: partner.notes ?? '',
      isActive: partner.isActive,
    });
    setDialogOpen(true);
  };

  const onSubmit = async (values: PartnerFormValues) => {
    setIsSaving(true);
    try {
      const url = editingPartner ? `/api/partners/${editingPartner.id}` : '/api/partners';
      const method = editingPartner ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to save');
      }

      toast({
        title: editingPartner ? 'Partner updated' : 'Partner created',
        description: `${values.name} has been ${editingPartner ? 'updated' : 'added'}.`,
      });

      setDialogOpen(false);
      fetchPartners();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  const toggleActive = async (partner: ExternalPartner) => {
    try {
      const res = await fetch(`/api/partners/${partner.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !partner.isActive }),
      });

      if (!res.ok) throw new Error('Failed to update');

      setPartners((prev) =>
        prev.map((p) => (p.id === partner.id ? { ...p, isActive: !p.isActive } : p))
      );
    } catch {
      toast({ title: 'Error', description: 'Failed to update status', variant: 'destructive' });
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/partners/${deleteTarget.id}`, { method: 'DELETE' });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to delete');
      }
      toast({ title: 'Partner deleted', description: `${deleteTarget.name} has been removed.` });
      setDeleteTarget(null);
      fetchPartners();
    } catch (error: any) {
      toast({ title: 'Cannot delete', description: error.message, variant: 'destructive' });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="container mx-auto py-8 space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href={`/${locale}/settings`}>
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Settings
          </Button>
        </Link>
      </div>

      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Factory className="h-6 w-6" />
            External Partners
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage milling centres and design partners used in production tracking.
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4 mr-2" />
          Add Partner
        </Button>
      </div>

      {/* Partners Table */}
      <Card>
        <CardHeader>
          <CardTitle>Partners</CardTitle>
          <CardDescription>
            {partners.filter((p) => p.isActive).length} active ·{' '}
            {partners.length} total
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin mr-2" />
              Loading partners...
            </div>
          ) : partners.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Factory className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p>No partners yet.</p>
              <p className="text-sm">Add your milling centres and design partners.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Active</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {partners.map((partner) => (
                  <TableRow key={partner.id} className={!partner.isActive ? 'opacity-50' : ''}>
                    <TableCell className="font-medium">{partner.name}</TableCell>
                    <TableCell>
                      <Badge className={TYPE_COLORS[partner.type]}>
                        {TYPE_LABELS[partner.type]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {partner.email ? (
                        <a href={`mailto:${partner.email}`} className="hover:underline">
                          {partner.email}
                        </a>
                      ) : (
                        '—'
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {partner.phone || '—'}
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={partner.isActive}
                        onCheckedChange={() => toggleActive(partner)}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEdit(partner)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeleteTarget(partner)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingPartner ? 'Edit Partner' : 'Add External Partner'}
            </DialogTitle>
            <DialogDescription>
              {editingPartner
                ? 'Update the details for this partner.'
                : 'Add a milling centre or design partner.'}
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name *</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. ZirkonZahn GmbH" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="MILLING">Milling / Printing</SelectItem>
                        <SelectItem value="DESIGN">Design / CAD</SelectItem>
                        <SelectItem value="BOTH">Design + Milling</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="contact@partner.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone</FormLabel>
                      <FormControl>
                        <Input placeholder="+386 ..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Account number, portal URL, special instructions..."
                        rows={3}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem className="flex items-center gap-3">
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <FormLabel className="!mt-0">Active</FormLabel>
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSaving}>
                  {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  {editingPartner ? 'Save changes' : 'Add partner'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete partner?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete <strong>{deleteTarget?.name}</strong>.
              This action cannot be undone. Partners used in worksheets cannot be deleted — deactivate them instead.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
