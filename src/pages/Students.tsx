import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { Profile } from '@/types/database';
import { Users, Mail, Loader2, UserPlus, Search, X, Check } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { toast } from 'sonner';

const Students = () => {
  const { profile } = useAuth();
  const [students, setStudents] = useState<Profile[]>([]);
  const [allStudents, setAllStudents] = useState<Profile[]>([]);
  const [myStudentIds, setMyStudentIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [addingStudent, setAddingStudent] = useState<string | null>(null);

  const isProfessor = profile?.role === 'professor' || profile?.role === 'admin';

  useEffect(() => {
    fetchStudents();
  }, [profile]);

  const fetchStudents = async () => {
    if (!profile) return;

    if (isProfessor) {
      // Fetch professor's students
      const { data: professorStudents } = await supabase
        .from('professor_students')
        .select('student_id')
        .eq('professor_id', profile.id);

      const studentIds = professorStudents?.map((ps) => ps.student_id) || [];
      setMyStudentIds(studentIds);

      if (studentIds.length > 0) {
        const { data } = await supabase
          .from('profiles')
          .select('*')
          .in('id', studentIds)
          .order('full_name');

        setStudents((data as Profile[]) || []);
      } else {
        setStudents([]);
      }

      // Fetch all students for adding
      const { data: all } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'student')
        .order('full_name');

      setAllStudents((all as Profile[]) || []);
    } else {
      // Students see all students
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'student')
        .order('full_name');

      setStudents((data as Profile[]) || []);
    }

    setLoading(false);
  };

  const addStudent = async (studentId: string) => {
    if (!profile) return;

    setAddingStudent(studentId);

    const { error } = await supabase.from('professor_students').insert({
      professor_id: profile.id,
      student_id: studentId,
    });

    if (error) {
      toast.error("Erreur lors de l'ajout de l'étudiant");
    } else {
      toast.success('Étudiant ajouté avec succès');
      setMyStudentIds((prev) => [...prev, studentId]);
      const addedStudent = allStudents.find((s) => s.id === studentId);
      if (addedStudent) {
        setStudents((prev) => [...prev, addedStudent].sort((a, b) => a.full_name.localeCompare(b.full_name)));
      }
    }

    setAddingStudent(null);
  };

  const removeStudent = async (studentId: string) => {
    if (!profile) return;

    const { error } = await supabase
      .from('professor_students')
      .delete()
      .eq('professor_id', profile.id)
      .eq('student_id', studentId);

    if (error) {
      toast.error("Erreur lors de la suppression de l'étudiant");
    } else {
      toast.success('Étudiant retiré avec succès');
      setMyStudentIds((prev) => prev.filter((id) => id !== studentId));
      setStudents((prev) => prev.filter((s) => s.id !== studentId));
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const filteredAllStudents = allStudents.filter(
    (s) =>
      !myStudentIds.includes(s.id) &&
      (s.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.email.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              {isProfessor ? 'Mes Étudiants' : 'Étudiants'}
            </h1>
            <p className="text-muted-foreground">
              {isProfessor
                ? 'Gérez vos étudiants assignés'
                : 'Liste des étudiants inscrits sur la plateforme'}
            </p>
          </div>

          {isProfessor && (
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button className="gradient-primary btn-shine">
                  <UserPlus className="w-4 h-4 mr-2" />
                  Ajouter un étudiant
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Ajouter un étudiant</DialogTitle>
                  <DialogDescription>
                    Recherchez et ajoutez des étudiants à votre liste
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Rechercher par nom ou email..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                  <div className="max-h-[300px] overflow-y-auto space-y-2">
                    {filteredAllStudents.length === 0 ? (
                      <p className="text-center text-muted-foreground py-4">
                        Aucun étudiant trouvé
                      </p>
                    ) : (
                      filteredAllStudents.map((student) => (
                        <div
                          key={student.id}
                          className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <Avatar className="h-10 w-10">
                              <AvatarImage src={student.avatar_url} />
                              <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                                {getInitials(student.full_name)}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium text-sm">{student.full_name}</p>
                              <p className="text-xs text-muted-foreground">{student.email}</p>
                            </div>
                          </div>
                          <Button
                            size="sm"
                            onClick={() => addStudent(student.id)}
                            disabled={addingStudent === student.id}
                          >
                            {addingStudent === student.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Check className="w-4 h-4" />
                            )}
                          </Button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {/* Students grid */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : students.length === 0 ? (
          <Card className="border-0 shadow-md">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Users className="w-16 h-16 text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-medium text-foreground">Aucun étudiant</h3>
              <p className="text-muted-foreground text-center mt-1">
                {isProfessor
                  ? "Vous n'avez pas encore d'étudiants assignés. Cliquez sur le bouton ci-dessus pour en ajouter."
                  : 'Aucun étudiant inscrit pour le moment.'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {students.map((student) => (
              <Card
                key={student.id}
                className="border-0 shadow-md hover:shadow-lg transition-shadow group"
              >
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <Avatar className="h-14 w-14">
                      <AvatarImage src={student.avatar_url} />
                      <AvatarFallback className="bg-primary text-primary-foreground text-lg">
                        {getInitials(student.full_name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between">
                        <h3 className="font-semibold text-foreground truncate">
                          {student.full_name}
                        </h3>
                        {isProfessor && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="opacity-0 group-hover:opacity-100 transition-opacity -mt-1 -mr-2 text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => removeStudent(student.id)}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                        <Mail className="w-3.5 h-3.5" />
                        <span className="truncate">{student.email}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-3">
                        <Badge variant="secondary" className="text-xs">
                          Étudiant
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          Inscrit le{' '}
                          {format(new Date(student.created_at), 'dd MMM yyyy', { locale: fr })}
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Students;
