-- Drop the overly permissive policy
drop policy "User roles are viewable by everyone" on public.user_roles;

-- Drop the admin-only policy that might cause issues
drop policy "Only admins can manage user roles" on public.user_roles;

-- Create more secure policies
-- Users can only view their own roles
create policy "Users can view their own roles" 
on public.user_roles 
for select 
using (auth.uid() = user_id);

-- Users can only insert their own roles (though this should typically be handled by triggers)
create policy "Users can insert their own roles" 
on public.user_roles 
for insert 
with check (auth.uid() = user_id);

-- Only admins can update user roles
create policy "Admins can update user roles" 
on public.user_roles 
for update 
using (public.has_role(auth.uid(), 'admin'));

-- Only admins can delete user roles
create policy "Admins can delete user roles" 
on public.user_roles 
for delete 
using (public.has_role(auth.uid(), 'admin'));

-- Admins can view all user roles for management purposes
create policy "Admins can view all user roles" 
on public.user_roles 
for select 
using (public.has_role(auth.uid(), 'admin'));