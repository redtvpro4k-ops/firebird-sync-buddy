-- Assign admin role to all existing users
INSERT INTO public.user_roles (user_id, role)
SELECT DISTINCT user_id, 'admin'::app_role
FROM public.user_roles 
WHERE user_id NOT IN (
  SELECT user_id 
  FROM public.user_roles 
  WHERE role = 'admin'::app_role
);