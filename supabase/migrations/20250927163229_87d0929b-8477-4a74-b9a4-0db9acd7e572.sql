-- Add status field to profiles table for user blocking/activation
ALTER TABLE public.profiles 
ADD COLUMN status text DEFAULT 'active' CHECK (status IN ('active', 'blocked', 'suspended'));

-- Add RLS policies for admins to manage all user profiles
CREATE POLICY "Admins can view all profiles" ON public.profiles
FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update all profiles" ON public.profiles  
FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete all profiles" ON public.profiles
FOR DELETE USING (public.has_role(auth.uid(), 'admin'));