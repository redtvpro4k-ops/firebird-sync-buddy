-- Remove the dangerous policy that allows users to insert their own roles
drop policy "Users can insert their own roles" on public.user_roles;

-- Create a secure policy that only allows admins to insert roles for any user
create policy "Only admins can assign roles" 
on public.user_roles 
for insert 
with check (public.has_role(auth.uid(), 'admin'));

-- Also add a special exception for the system trigger to assign default roles
-- This allows the handle_new_user() trigger to work for new user registration
create policy "System can assign default user role" 
on public.user_roles 
for insert 
with check (role = 'user' AND auth.uid() = user_id);