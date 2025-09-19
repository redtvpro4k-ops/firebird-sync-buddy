-- Remove the dangerous policy that exposes all profiles to everyone
drop policy "Profiles are viewable by everyone" on public.profiles;

-- Create secure policies for profile access
-- Users can only view their own profile
create policy "Users can view their own profile" 
on public.profiles 
for select 
using (auth.uid() = user_id);

-- Admins can view all profiles for management purposes
create policy "Admins can view all profiles" 
on public.profiles 
for select 
using (public.has_role(auth.uid(), 'admin'));

-- Only admins can insert profiles for other users (in case manual creation is needed)
create policy "Admins can create profiles" 
on public.profiles 
for insert 
with check (public.has_role(auth.uid(), 'admin'));