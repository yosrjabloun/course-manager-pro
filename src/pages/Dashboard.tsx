import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { BookOpen, FolderOpen, FileText, TrendingUp, Clock, ArrowRight, Calendar, BarChart3, Users, GraduationCap, CheckCircle } from 'lucide-react';
import { format, subDays } from 'date-fns';
import { fr } from 'date-fns/locale';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

interface Stats {
  subjects: number;
  courses: number;
  submissions: number;
  pendingSubmissions: number;
  gradedSubmissions: number;
  students: number;
  professors: number;
}

interface RecentCourse {
  id: string;
  title: string;
  deadline?: string;
  subject: { name: string; color: string } | null;
}

interface SubmissionsByDay {
  date: string;
  count: number;
}

interface StatusData {
  name: string;
  value: number;
  color: string;
}

const Dashboard = () => {
  const { profile } = useAuth();
  const [stats, setStats] = useState<Stats>({ 
    subjects: 0, 
    courses: 0, 
    submissions: 0, 
    pendingSubmissions: 0,
    gradedSubmissions: 0,
    students: 0,
    professors: 0
  });
  const [recentCourses, setRecentCourses] = useState<RecentCourse[]>([]);
  const [submissionsByDay, setSubmissionsByDay] = useState<SubmissionsByDay[]>([]);
  const [statusData, setStatusData] = useState<StatusData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      const [
        subjectsRes, 
        coursesRes, 
        submissionsRes, 
        pendingRes, 
        gradedRes,
        studentsRes,
        professorsRes,
        recentRes,
        submissionsDataRes
      ] = await Promise.all([
        supabase.from('subjects').select('id', { count: 'exact', head: true }),
        supabase.from('courses').select('id', { count: 'exact', head: true }),
        supabase.from('submissions').select('id', { count: 'exact', head: true }),
        supabase.from('submissions').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('submissions').select('id', { count: 'exact', head: true }).eq('status', 'graded'),
        supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'student'),
        supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'professor'),
        supabase
          .from('courses')
          .select('id, title, deadline, subject:subjects(name, color)')
          .order('created_at', { ascending: false })
          .limit(5),
        supabase
          .from('submissions')
          .select('created_at, status')
          .gte('created_at', subDays(new Date(), 7).toISOString()),
      ]);

      setStats({
        subjects: subjectsRes.count || 0,
        courses: coursesRes.count || 0,
        submissions: submissionsRes.count || 0,
        pendingSubmissions: pendingRes.count || 0,
        gradedSubmissions: gradedRes.count || 0,
        students: studentsRes.count || 0,
        professors: professorsRes.count || 0,
      });

      if (recentRes.data) {
        setRecentCourses(recentRes.data as RecentCourse[]);
      }

      // Process submissions by day
      if (submissionsDataRes.data) {
        const byDay: Record<string, number> = {};
        for (let i = 6; i >= 0; i--) {
          const date = format(subDays(new Date(), i), 'yyyy-MM-dd');
          byDay[date] = 0;
        }
        
        submissionsDataRes.data.forEach((s) => {
          const date = format(new Date(s.created_at), 'yyyy-MM-dd');
          if (byDay[date] !== undefined) {
            byDay[date]++;
          }
        });

        setSubmissionsByDay(
          Object.entries(byDay).map(([date, count]) => ({
            date: format(new Date(date), 'EEE', { locale: fr }),
            count,
          }))
        );

        // Process status data
        const pending = submissionsDataRes.data.filter((s) => s.status === 'pending').length;
        const graded = submissionsDataRes.data.filter((s) => s.status === 'graded').length;
        const reviewed = submissionsDataRes.data.filter((s) => s.status === 'reviewed').length;

        setStatusData([
          { name: 'En attente', value: pending, color: 'hsl(var(--warning))' },
          { name: 'Notées', value: graded, color: 'hsl(var(--success))' },
          { name: 'Révisées', value: reviewed, color: 'hsl(var(--primary))' },
        ]);
      }

      setLoading(false);
    };

    fetchStats();
  }, []);

  const statsCards = [
    {
      title: 'Matières',
      value: stats.subjects,
      icon: FolderOpen,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
      href: '/subjects',
    },
    {
      title: 'Cours',
      value: stats.courses,
      icon: BookOpen,
      color: 'text-accent',
      bgColor: 'bg-accent/10',
      href: '/courses',
    },
    {
      title: 'Soumissions',
      value: stats.submissions,
      icon: FileText,
      color: 'text-success',
      bgColor: 'bg-success/10',
      href: '/submissions',
    },
    {
      title: 'En attente',
      value: stats.pendingSubmissions,
      icon: Clock,
      color: 'text-warning',
      bgColor: 'bg-warning/10',
      href: '/submissions',
    },
  ];

  const secondaryStats = [
    {
      title: 'Étudiants',
      value: stats.students,
      icon: Users,
      color: 'text-primary',
    },
    {
      title: 'Professeurs',
      value: stats.professors,
      icon: GraduationCap,
      color: 'text-accent',
    },
    {
      title: 'Notées',
      value: stats.gradedSubmissions,
      icon: CheckCircle,
      color: 'text-success',
    },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Welcome section */}
        <div className="gradient-hero rounded-2xl p-8 lg:p-10 animate-slide-up relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-accent/5" />
          <div className="relative">
            <h1 className="text-3xl lg:text-4xl font-bold text-foreground">
              Bonjour, {profile?.full_name?.split(' ')[0] || 'Utilisateur'} 👋
            </h1>
            <p className="text-muted-foreground mt-3 text-lg max-w-xl">
              Bienvenue sur votre tableau de bord. Voici un aperçu de vos activités récentes.
            </p>
            <div className="flex gap-3 mt-6">
              <Link to="/courses">
                <Button className="gradient-primary btn-shine shadow-glow">
                  Voir les cours
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
              <Link to="/analytics">
                <Button variant="outline" className="glass">
                  <BarChart3 className="w-4 h-4 mr-2" />
                  Analytiques
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Stats grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {statsCards.map((stat, index) => (
            <Link key={stat.title} to={stat.href}>
              <Card 
                className="border-0 shadow-md card-hover stat-card animate-slide-up"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">{stat.title}</p>
                      <p className="text-3xl font-bold text-foreground mt-1">
                        {loading ? (
                          <span className="inline-block w-12 h-8 bg-muted animate-pulse rounded" />
                        ) : (
                          stat.value
                        )}
                      </p>
                    </div>
                    <div className={`w-14 h-14 rounded-2xl ${stat.bgColor} flex items-center justify-center shadow-sm`}>
                      <stat.icon className={`w-7 h-7 ${stat.color}`} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>

        {/* Charts section */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Submissions over time */}
          <Card className="border-0 shadow-md glass animate-slide-up" style={{ animationDelay: '400ms' }}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-primary" />
                Soumissions (7 derniers jours)
              </CardTitle>
              <CardDescription>Évolution des soumissions cette semaine</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="h-[200px] bg-muted animate-pulse rounded-lg" />
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={submissionsByDay}>
                    <defs>
                      <linearGradient id="colorSubmissions" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="date" className="text-xs fill-muted-foreground" />
                    <YAxis className="text-xs fill-muted-foreground" />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))', 
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="count"
                      stroke="hsl(var(--primary))"
                      fillOpacity={1}
                      fill="url(#colorSubmissions)"
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Status distribution */}
          <Card className="border-0 shadow-md glass animate-slide-up" style={{ animationDelay: '500ms' }}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-accent" />
                Distribution par statut
              </CardTitle>
              <CardDescription>Répartition des soumissions par statut</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="h-[200px] bg-muted animate-pulse rounded-lg" />
              ) : (
                <div className="flex items-center gap-6">
                  <ResponsiveContainer width="50%" height={200}>
                    <PieChart>
                      <Pie
                        data={statusData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {statusData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--card))', 
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px'
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex-1 space-y-3">
                    {statusData.map((status) => (
                      <div key={status.name} className="flex items-center gap-3">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: status.color }}
                        />
                        <span className="text-sm text-muted-foreground flex-1">{status.name}</span>
                        <span className="font-semibold text-foreground">{status.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Secondary stats */}
        <div className="grid gap-4 md:grid-cols-3">
          {secondaryStats.map((stat, index) => (
            <Card 
              key={stat.title} 
              className="border-0 shadow-md glass animate-slide-up"
              style={{ animationDelay: `${(index + 6) * 100}ms` }}
            >
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-xl bg-muted flex items-center justify-center`}>
                    <stat.icon className={`w-6 h-6 ${stat.color}`} />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{stat.title}</p>
                    <p className="text-2xl font-bold text-foreground">
                      {loading ? (
                        <span className="inline-block w-8 h-6 bg-muted animate-pulse rounded" />
                      ) : (
                        stat.value
                      )}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Recent courses */}
        <Card className="border-0 shadow-md glass animate-slide-up" style={{ animationDelay: '900ms' }}>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-primary" />
                Cours récents
              </CardTitle>
              <CardDescription>Les derniers cours ajoutés à la plateforme</CardDescription>
            </div>
            <Link to="/courses">
              <Button variant="ghost" size="sm">
                Voir tout
                <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-16 bg-muted animate-pulse rounded-xl" />
                ))}
              </div>
            ) : recentCourses.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 mx-auto rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                  <BookOpen className="w-8 h-8 text-primary" />
                </div>
                <p className="text-muted-foreground">Aucun cours disponible</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentCourses.map((course, index) => (
                  <Link key={course.id} to={`/courses/${course.id}`}>
                    <div 
                      className="flex items-center gap-4 p-4 rounded-xl bg-secondary/30 hover:bg-secondary/60 transition-all hover:-translate-x-1 group"
                    >
                      <div
                        className="w-1.5 h-14 rounded-full transition-all group-hover:h-16"
                        style={{ backgroundColor: course.subject?.color || '#3B82F6' }}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                          {course.title}
                        </p>
                        <p className="text-sm text-muted-foreground">{course.subject?.name || 'Sans matière'}</p>
                      </div>
                      {course.deadline && (
                        <div className="text-right hidden sm:block">
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Calendar className="w-3.5 h-3.5" />
                            <span>Deadline</span>
                          </div>
                          <p className="text-sm font-medium text-foreground">
                            {format(new Date(course.deadline), 'dd MMM yyyy', { locale: fr })}
                          </p>
                        </div>
                      )}
                      <ArrowRight className="w-5 h-5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
