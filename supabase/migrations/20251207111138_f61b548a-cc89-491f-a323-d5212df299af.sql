
-- Create professor_students table to link professors with their students
CREATE TABLE public.professor_students (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    professor_id UUID NOT NULL,
    student_id UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(professor_id, student_id)
);

-- Enable RLS
ALTER TABLE public.professor_students ENABLE ROW LEVEL SECURITY;

-- Policies for professor_students
CREATE POLICY "Professors can view their own students"
ON public.professor_students
FOR SELECT
USING (
    professor_id IN (
        SELECT id FROM profiles WHERE user_id = auth.uid()
    ) OR
    student_id IN (
        SELECT id FROM profiles WHERE user_id = auth.uid()
    )
);

CREATE POLICY "Professors can add students"
ON public.professor_students
FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM profiles
        WHERE user_id = auth.uid() AND role IN ('professor', 'admin')
    )
);

CREATE POLICY "Professors can remove their students"
ON public.professor_students
FOR DELETE
USING (
    professor_id IN (
        SELECT id FROM profiles WHERE user_id = auth.uid()
    )
);

-- Create notifications table
CREATE TABLE public.notifications (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'info',
    read BOOLEAN NOT NULL DEFAULT false,
    data JSONB,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Policies for notifications
CREATE POLICY "Users can view their own notifications"
ON public.notifications
FOR SELECT
USING (
    user_id IN (
        SELECT id FROM profiles WHERE user_id = auth.uid()
    )
);

CREATE POLICY "Users can update their own notifications"
ON public.notifications
FOR UPDATE
USING (
    user_id IN (
        SELECT id FROM profiles WHERE user_id = auth.uid()
    )
);

CREATE POLICY "Authenticated users can create notifications"
ON public.notifications
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- Enable realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
