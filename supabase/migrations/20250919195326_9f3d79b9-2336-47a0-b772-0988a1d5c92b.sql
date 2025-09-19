-- Create profiles table
create table public.profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null unique,
  display_name text,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

-- Create user_roles table
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role app_role not null,
  created_at timestamp with time zone not null default now(),
  unique (user_id, role)
);

-- Enable Row Level Security
alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;

-- Create policies for profiles
create policy "Profiles are viewable by everyone" 
on public.profiles 
for select 
using (true);

create policy "Users can update their own profile" 
on public.profiles 
for update 
using (auth.uid() = user_id);

create policy "Users can insert their own profile" 
on public.profiles 
for insert 
with check (auth.uid() = user_id);

-- Create policies for user_roles
create policy "User roles are viewable by everyone" 
on public.user_roles 
for select 
using (true);

create policy "Only admins can manage user roles" 
on public.user_roles 
for all 
using (public.has_role(auth.uid(), 'admin'));

-- Create trigger for automatic timestamp updates on profiles
create trigger update_profiles_updated_at
before update on public.profiles
for each row
execute function public.update_updated_at_column();