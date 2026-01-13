-- =============================================
-- AUTH DB SCHEMA
-- User authentication, roles, and permissions
-- =============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- USERS
-- Individual users linked to organizations
-- =============================================
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL, -- References organizations in Customers DB
    email VARCHAR(255) UNIQUE NOT NULL,
    email_verified BOOLEAN DEFAULT FALSE,
    email_verified_at TIMESTAMP WITH TIME ZONE,
    name VARCHAR(255),
    avatar_url TEXT,
    phone VARCHAR(50),
    timezone VARCHAR(100) DEFAULT 'UTC',
    last_login_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT TRUE,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_users_organization_id ON users(organization_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_is_active ON users(is_active);

-- =============================================
-- ROLES
-- Define role types (founder/admin, SDR, etc.)
-- =============================================
CREATE TABLE roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) UNIQUE NOT NULL,
    display_name VARCHAR(100) NOT NULL,
    description TEXT,
    is_system_role BOOLEAN DEFAULT FALSE, -- System roles can't be deleted
    hierarchy_level INTEGER DEFAULT 0, -- Higher = more access (admin=100, member=10)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default roles
INSERT INTO roles (name, display_name, description, is_system_role, hierarchy_level) VALUES
    ('owner', 'Owner', 'Organization owner with full access to all features and billing', TRUE, 100),
    ('admin', 'Admin', 'Administrator with full access to features but limited billing access', TRUE, 80),
    ('manager', 'Manager', 'Can manage team members, campaigns, and view analytics', TRUE, 60),
    ('sdr', 'SDR', 'Sales Development Rep - can manage leads and send campaigns', TRUE, 40),
    ('viewer', 'Viewer', 'Read-only access to dashboards and reports', TRUE, 20);

-- =============================================
-- PERMISSIONS
-- Granular permissions for features/resources
-- =============================================
CREATE TABLE permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) UNIQUE NOT NULL,
    display_name VARCHAR(100) NOT NULL,
    description TEXT,
    resource VARCHAR(100) NOT NULL, -- e.g., 'leads', 'campaigns', 'billing', 'team'
    action VARCHAR(50) NOT NULL, -- e.g., 'create', 'read', 'update', 'delete', 'manage'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default permissions
INSERT INTO permissions (name, display_name, description, resource, action) VALUES
    -- Leads permissions
    ('leads:read', 'View Leads', 'Can view leads and lead details', 'leads', 'read'),
    ('leads:create', 'Create Leads', 'Can create and import leads', 'leads', 'create'),
    ('leads:update', 'Update Leads', 'Can edit lead information', 'leads', 'update'),
    ('leads:delete', 'Delete Leads', 'Can delete leads', 'leads', 'delete'),
    ('leads:export', 'Export Leads', 'Can export leads to CSV', 'leads', 'export'),

    -- Lead Lists permissions
    ('lead_lists:read', 'View Lead Lists', 'Can view lead lists', 'lead_lists', 'read'),
    ('lead_lists:create', 'Create Lead Lists', 'Can create lead lists', 'lead_lists', 'create'),
    ('lead_lists:update', 'Update Lead Lists', 'Can edit lead lists', 'lead_lists', 'update'),
    ('lead_lists:delete', 'Delete Lead Lists', 'Can delete lead lists', 'lead_lists', 'delete'),

    -- Campaigns permissions
    ('campaigns:read', 'View Campaigns', 'Can view campaigns and stats', 'campaigns', 'read'),
    ('campaigns:create', 'Create Campaigns', 'Can create new campaigns', 'campaigns', 'create'),
    ('campaigns:update', 'Update Campaigns', 'Can edit campaigns', 'campaigns', 'update'),
    ('campaigns:delete', 'Delete Campaigns', 'Can delete campaigns', 'campaigns', 'delete'),
    ('campaigns:send', 'Send Campaigns', 'Can activate and send campaigns', 'campaigns', 'send'),

    -- Inbox permissions
    ('inbox:read', 'View Inbox', 'Can view inbox messages', 'inbox', 'read'),
    ('inbox:reply', 'Reply to Messages', 'Can reply to inbox messages', 'inbox', 'reply'),

    -- Analytics permissions
    ('analytics:read', 'View Analytics', 'Can view analytics and reports', 'analytics', 'read'),
    ('analytics:export', 'Export Analytics', 'Can export analytics data', 'analytics', 'export'),

    -- Team permissions
    ('team:read', 'View Team', 'Can view team members', 'team', 'read'),
    ('team:invite', 'Invite Team Members', 'Can invite new team members', 'team', 'invite'),
    ('team:update', 'Update Team Members', 'Can edit team member roles', 'team', 'update'),
    ('team:remove', 'Remove Team Members', 'Can remove team members', 'team', 'remove'),

    -- Billing permissions
    ('billing:read', 'View Billing', 'Can view billing information', 'billing', 'read'),
    ('billing:manage', 'Manage Billing', 'Can update billing and subscription', 'billing', 'manage'),

    -- Settings permissions
    ('settings:read', 'View Settings', 'Can view organization settings', 'settings', 'read'),
    ('settings:update', 'Update Settings', 'Can update organization settings', 'settings', 'update');

-- =============================================
-- ROLE_PERMISSIONS
-- Junction table linking roles to permissions
-- =============================================
CREATE TABLE role_permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT unique_role_permission UNIQUE (role_id, permission_id)
);

CREATE INDEX idx_role_permissions_role_id ON role_permissions(role_id);
CREATE INDEX idx_role_permissions_permission_id ON role_permissions(permission_id);

-- Assign permissions to roles
-- Owner: All permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p WHERE r.name = 'owner';

-- Admin: All except billing:manage
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name = 'admin' AND p.name != 'billing:manage';

-- Manager: Team, campaigns, leads, analytics (no billing/settings)
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name = 'manager'
AND p.resource IN ('leads', 'lead_lists', 'campaigns', 'inbox', 'analytics', 'team')
AND p.action != 'remove';

-- SDR: Leads, campaigns, inbox (no team management)
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name = 'sdr'
AND p.resource IN ('leads', 'lead_lists', 'campaigns', 'inbox')
AND p.action IN ('read', 'create', 'update', 'reply', 'send');

-- Viewer: Read-only access
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name = 'viewer'
AND p.action = 'read';

-- =============================================
-- USER_ROLES
-- Junction table linking users to roles
-- =============================================
CREATE TABLE user_roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    assigned_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT unique_user_role UNIQUE (user_id, role_id)
);

CREATE INDEX idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX idx_user_roles_role_id ON user_roles(role_id);

-- =============================================
-- SESSIONS
-- User sessions for authentication
-- (Can be used alongside better-auth if needed)
-- =============================================
CREATE TABLE sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(255) UNIQUE NOT NULL,
    refresh_token VARCHAR(255),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    ip_address INET,
    user_agent TEXT,
    is_valid BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_token ON sessions(token);
CREATE INDEX idx_sessions_expires_at ON sessions(expires_at);

-- =============================================
-- INVITATIONS
-- Pending team invitations
-- =============================================
CREATE TABLE invitations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL, -- References organizations in Customers DB
    email VARCHAR(255) NOT NULL,
    role_id UUID NOT NULL REFERENCES roles(id),
    invited_by UUID NOT NULL REFERENCES users(id),
    token VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    accepted_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT unique_pending_invitation UNIQUE (organization_id, email)
);

CREATE INDEX idx_invitations_organization_id ON invitations(organization_id);
CREATE INDEX idx_invitations_email ON invitations(email);
CREATE INDEX idx_invitations_token ON invitations(token);

-- =============================================
-- AUDIT LOG
-- Track security-relevant actions
-- =============================================
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    organization_id UUID,
    action VARCHAR(100) NOT NULL, -- 'login', 'logout', 'password_change', 'role_change', etc.
    resource_type VARCHAR(100),
    resource_id UUID,
    ip_address INET,
    user_agent TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_organization_id ON audit_logs(organization_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);

-- =============================================
-- TRIGGERS
-- Auto-update updated_at timestamp
-- =============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_roles_updated_at
    BEFORE UPDATE ON roles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sessions_updated_at
    BEFORE UPDATE ON sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- ROW LEVEL SECURITY (RLS)
-- Enable RLS for Supabase
-- =============================================
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- =============================================
-- HELPER FUNCTIONS
-- =============================================

-- Function to check if a user has a specific permission
CREATE OR REPLACE FUNCTION user_has_permission(
    p_user_id UUID,
    p_permission_name VARCHAR
) RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1
        FROM user_roles ur
        JOIN role_permissions rp ON ur.role_id = rp.role_id
        JOIN permissions p ON rp.permission_id = p.id
        WHERE ur.user_id = p_user_id
        AND p.name = p_permission_name
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get all permissions for a user
CREATE OR REPLACE FUNCTION get_user_permissions(p_user_id UUID)
RETURNS TABLE (permission_name VARCHAR, resource VARCHAR, action VARCHAR) AS $$
BEGIN
    RETURN QUERY
    SELECT DISTINCT p.name, p.resource, p.action
    FROM user_roles ur
    JOIN role_permissions rp ON ur.role_id = rp.role_id
    JOIN permissions p ON rp.permission_id = p.id
    WHERE ur.user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
