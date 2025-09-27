import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Edit, Trash2, UserX, UserCheck } from "lucide-react";

interface Profile {
  id: string;
  user_id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  street: string | null;
  house_number: string | null;
  status: string;
  created_at: string;
}

interface UserRole {
  user_id: string;
  role: "admin" | "user";
}

export const UserManagement = () => {
  const [users, setUsers] = useState<Profile[]>([]);
  const [userRoles, setUserRoles] = useState<UserRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingUser, setEditingUser] = useState<Profile | null>(null);
  const [editForm, setEditForm] = useState({
    first_name: "",
    last_name: "",
    email: "",
    street: "",
    house_number: "",
    status: "active" as "active" | "blocked" | "suspended",
    role: "user" as "admin" | "user"
  });

  useEffect(() => {
    fetchUsers();
    fetchUserRoles();
  }, []);

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error("Error fetching users:", error);
      toast.error("Fehler beim Laden der Benutzer");
    } finally {
      setLoading(false);
    }
  };

  const fetchUserRoles = async () => {
    try {
      const { data, error } = await supabase
        .from("user_roles")
        .select("user_id, role");

      if (error) throw error;
      setUserRoles(data || []);
    } catch (error) {
      console.error("Error fetching user roles:", error);
    }
  };

  const getUserRole = (userId: string) => {
    const userRole = userRoles.find(role => role.user_id === userId);
    return userRole?.role || "user";
  };

  const handleEditUser = (user: Profile) => {
    setEditingUser(user);
    setEditForm({
      first_name: user.first_name || "",
      last_name: user.last_name || "",
      email: user.email || "",
      street: user.street || "",
      house_number: user.house_number || "",
      status: user.status as "active" | "blocked" | "suspended",
      role: getUserRole(user.user_id) as "admin" | "user"
    });
  };

  const handleUpdateUser = async () => {
    if (!editingUser) return;

    try {
      // Update profile
      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          first_name: editForm.first_name,
          last_name: editForm.last_name,
          email: editForm.email,
          street: editForm.street,
          house_number: editForm.house_number,
          status: editForm.status
        })
        .eq("user_id", editingUser.user_id);

      if (profileError) throw profileError;

      // Update role if changed
      const currentRole = getUserRole(editingUser.user_id);
      if (currentRole !== editForm.role) {
        const { error: roleError } = await supabase
          .from("user_roles")
          .update({ role: editForm.role })
          .eq("user_id", editingUser.user_id);

        if (roleError) throw roleError;
      }

      toast.success("Benutzer erfolgreich aktualisiert");
      setEditingUser(null);
      fetchUsers();
      fetchUserRoles();
    } catch (error) {
      console.error("Error updating user:", error);
      toast.error("Fehler beim Aktualisieren des Benutzers");
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm("Sind Sie sicher, dass Sie diesen Benutzer löschen möchten?")) return;

    try {
      const { error } = await supabase
        .from("profiles")
        .delete()
        .eq("user_id", userId);

      if (error) throw error;

      toast.success("Benutzer erfolgreich gelöscht");
      fetchUsers();
    } catch (error) {
      console.error("Error deleting user:", error);
      toast.error("Fehler beim Löschen des Benutzers");
    }
  };

  const handleToggleUserStatus = async (user: Profile) => {
    const newStatus = user.status === "active" ? "blocked" : "active";
    
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ status: newStatus })
        .eq("user_id", user.user_id);

      if (error) throw error;

      toast.success(`Benutzer ${newStatus === "blocked" ? "gesperrt" : "entsperrt"}`);
      fetchUsers();
    } catch (error) {
      console.error("Error updating user status:", error);
      toast.error("Fehler beim Ändern des Benutzerstatus");
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge variant="outline" className="text-green-600 border-green-600">Aktiv</Badge>;
      case "blocked":
        return <Badge variant="destructive">Gesperrt</Badge>;
      case "suspended":
        return <Badge variant="secondary">Suspendiert</Badge>;
      default:
        return <Badge variant="outline">Unbekannt</Badge>;
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "admin":
        return <Badge variant="default">Admin</Badge>;
      default:
        return <Badge variant="outline">Benutzer</Badge>;
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center p-8">Lade Benutzer...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Benutzerverwaltung</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>E-Mail</TableHead>
                <TableHead>Adresse</TableHead>
                <TableHead>Rolle</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Erstellt</TableHead>
                <TableHead>Aktionen</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    {user.first_name || user.last_name 
                      ? `${user.first_name || ""} ${user.last_name || ""}`.trim()
                      : "Kein Name"
                    }
                  </TableCell>
                  <TableCell>{user.email || "Keine E-Mail"}</TableCell>
                  <TableCell>
                    {user.street && user.house_number 
                      ? `${user.street} ${user.house_number}`
                      : "Keine Adresse"
                    }
                  </TableCell>
                  <TableCell>{getRoleBadge(getUserRole(user.user_id))}</TableCell>
                  <TableCell>{getStatusBadge(user.status)}</TableCell>
                  <TableCell>{new Date(user.created_at).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleEditUser(user)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Benutzer bearbeiten</DialogTitle>
                          </DialogHeader>
                          <div className="grid gap-4 py-4">
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <Label htmlFor="first_name">Vorname</Label>
                                <Input
                                  id="first_name"
                                  value={editForm.first_name}
                                  onChange={(e) => setEditForm({...editForm, first_name: e.target.value})}
                                />
                              </div>
                              <div>
                                <Label htmlFor="last_name">Nachname</Label>
                                <Input
                                  id="last_name"
                                  value={editForm.last_name}
                                  onChange={(e) => setEditForm({...editForm, last_name: e.target.value})}
                                />
                              </div>
                            </div>
                            <div>
                              <Label htmlFor="email">E-Mail</Label>
                              <Input
                                id="email"
                                type="email"
                                value={editForm.email}
                                onChange={(e) => setEditForm({...editForm, email: e.target.value})}
                              />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <Label htmlFor="street">Straße</Label>
                                <Input
                                  id="street"
                                  value={editForm.street}
                                  onChange={(e) => setEditForm({...editForm, street: e.target.value})}
                                />
                              </div>
                              <div>
                                <Label htmlFor="house_number">Hausnummer</Label>
                                <Input
                                  id="house_number"
                                  value={editForm.house_number}
                                  onChange={(e) => setEditForm({...editForm, house_number: e.target.value})}
                                />
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <Label htmlFor="role">Rolle</Label>
                                <Select value={editForm.role} onValueChange={(value: "admin" | "user") => setEditForm({...editForm, role: value})}>
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="user">Benutzer</SelectItem>
                                    <SelectItem value="admin">Admin</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div>
                                <Label htmlFor="status">Status</Label>
                                <Select value={editForm.status} onValueChange={(value: "active" | "blocked" | "suspended") => setEditForm({...editForm, status: value})}>
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="active">Aktiv</SelectItem>
                                    <SelectItem value="blocked">Gesperrt</SelectItem>
                                    <SelectItem value="suspended">Suspendiert</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                            <Button onClick={handleUpdateUser}>
                              Änderungen speichern
                            </Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleToggleUserStatus(user)}
                      >
                        {user.status === "active" ? (
                          <UserX className="h-4 w-4" />
                        ) : (
                          <UserCheck className="h-4 w-4" />
                        )}
                      </Button>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteUser(user.user_id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        
        {users.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            Keine Benutzer gefunden.
          </div>
        )}
      </CardContent>
    </Card>
  );
};