-- Create role enum
CREATE TYPE public.app_role AS ENUM ('employee', 'hr', 'manager');

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  department TEXT,
  position TEXT,
  hire_date DATE,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Create leaves table
CREATE TABLE public.leaves (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  leave_type TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  days INTEGER NOT NULL,
  reason TEXT NOT NULL,
  status TEXT DEFAULT 'Pending' CHECK (status IN ('Pending', 'Approved', 'Rejected')),
  approved_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.leaves ENABLE ROW LEVEL SECURITY;

-- Create employees table (for employee directory)
CREATE TABLE public.employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  phone TEXT,
  department TEXT NOT NULL,
  position TEXT NOT NULL,
  status TEXT DEFAULT 'Active' CHECK (status IN ('Active', 'Inactive', 'On Leave')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;

-- Create payslips table
CREATE TABLE public.payslips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  month TEXT NOT NULL,
  year INTEGER NOT NULL,
  basic_salary DECIMAL(10, 2) NOT NULL,
  allowances DECIMAL(10, 2) DEFAULT 0,
  deductions DECIMAL(10, 2) DEFAULT 0,
  net_salary DECIMAL(10, 2) NOT NULL,
  file_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, month, year)
);

ALTER TABLE public.payslips ENABLE ROW LEVEL SECURITY;

-- Create holidays table
CREATE TABLE public.holidays (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  date DATE NOT NULL,
  type TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.holidays ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Users can view all profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "HR and managers can update all profiles"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'hr') OR 
    public.has_role(auth.uid(), 'manager')
  );

CREATE POLICY "HR and managers can insert profiles"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'hr') OR 
    public.has_role(auth.uid(), 'manager')
  );

-- RLS Policies for user_roles
CREATE POLICY "Users can view own roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "HR and managers can view all roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'hr') OR 
    public.has_role(auth.uid(), 'manager')
  );

CREATE POLICY "HR and managers can insert roles"
  ON public.user_roles FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'hr') OR 
    public.has_role(auth.uid(), 'manager')
  );

CREATE POLICY "HR and managers can delete roles"
  ON public.user_roles FOR DELETE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'hr') OR 
    public.has_role(auth.uid(), 'manager')
  );

-- RLS Policies for leaves
CREATE POLICY "Users can view own leaves"
  ON public.leaves FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "HR and managers can view all leaves"
  ON public.leaves FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'hr') OR 
    public.has_role(auth.uid(), 'manager')
  );

CREATE POLICY "Users can insert own leaves"
  ON public.leaves FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "HR and managers can update leaves"
  ON public.leaves FOR UPDATE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'hr') OR 
    public.has_role(auth.uid(), 'manager')
  );

-- RLS Policies for employees
CREATE POLICY "Users can view all employees"
  ON public.employees FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "HR and managers can insert employees"
  ON public.employees FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'hr') OR 
    public.has_role(auth.uid(), 'manager')
  );

CREATE POLICY "HR and managers can update employees"
  ON public.employees FOR UPDATE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'hr') OR 
    public.has_role(auth.uid(), 'manager')
  );

CREATE POLICY "HR and managers can delete employees"
  ON public.employees FOR DELETE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'hr') OR 
    public.has_role(auth.uid(), 'manager')
  );

-- RLS Policies for payslips
CREATE POLICY "Users can view own payslips"
  ON public.payslips FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "HR and managers can view all payslips"
  ON public.payslips FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'hr') OR 
    public.has_role(auth.uid(), 'manager')
  );

CREATE POLICY "HR and managers can insert payslips"
  ON public.payslips FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'hr') OR 
    public.has_role(auth.uid(), 'manager')
  );

CREATE POLICY "HR and managers can update payslips"
  ON public.payslips FOR UPDATE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'hr') OR 
    public.has_role(auth.uid(), 'manager')
  );

-- RLS Policies for holidays
CREATE POLICY "Everyone can view holidays"
  ON public.holidays FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "HR and managers can insert holidays"
  ON public.holidays FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'hr') OR 
    public.has_role(auth.uid(), 'manager')
  );

CREATE POLICY "HR and managers can update holidays"
  ON public.holidays FOR UPDATE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'hr') OR 
    public.has_role(auth.uid(), 'manager')
  );

CREATE POLICY "HR and managers can delete holidays"
  ON public.holidays FOR DELETE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'hr') OR 
    public.has_role(auth.uid(), 'manager')
  );

-- Create trigger function for updating updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_leaves_updated_at
  BEFORE UPDATE ON public.leaves
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_employees_updated_at
  BEFORE UPDATE ON public.employees
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'New User'),
    NEW.email
  );
  
  -- Assign default employee role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'employee');
  
  RETURN NEW;
END;
$$;

-- Create trigger for new user registration
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();