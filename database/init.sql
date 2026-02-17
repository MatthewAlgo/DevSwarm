-- DevSwarm Database Schema
-- ========================

-- Extension for UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enum types
CREATE TYPE agent_status AS ENUM ('Idle', 'Working', 'Meeting', 'Error', 'Clocked Out');
CREATE TYPE task_status AS ENUM ('Backlog', 'In Progress', 'Review', 'Done', 'Blocked');
CREATE TYPE room_type AS ENUM ('Private Office', 'War Room', 'Desks', 'Lounge', 'Server Room');

-- Agents table
CREATE TABLE agents (
    id VARCHAR(32) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    role VARCHAR(200) NOT NULL,
    current_room room_type NOT NULL DEFAULT 'Desks',
    status agent_status NOT NULL DEFAULT 'Idle',
    current_task TEXT DEFAULT '',
    thought_chain TEXT DEFAULT '',
    tech_stack TEXT[] DEFAULT '{}',
    avatar_color VARCHAR(7) DEFAULT '#6366f1',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tasks table (Kanban items)
CREATE TABLE tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(500) NOT NULL,
    description TEXT DEFAULT '',
    status task_status NOT NULL DEFAULT 'Backlog',
    priority INTEGER DEFAULT 0,
    created_by VARCHAR(32) REFERENCES agents(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Task assignments (many-to-many: agents <-> tasks)
CREATE TABLE task_assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    agent_id VARCHAR(32) NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(task_id, agent_id)
);

-- Inter-agent messages
CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    from_agent VARCHAR(32) REFERENCES agents(id),
    to_agent VARCHAR(32) REFERENCES agents(id),
    content TEXT NOT NULL,
    message_type VARCHAR(50) DEFAULT 'chat',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Global office state snapshot (single row, continuously updated)
CREATE TABLE office_state (
    id INTEGER PRIMARY KEY DEFAULT 1,
    state_json JSONB NOT NULL DEFAULT '{}',
    version BIGINT NOT NULL DEFAULT 0,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Activity log for audit trail
CREATE TABLE activity_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_id VARCHAR(32) REFERENCES agents(id),
    action VARCHAR(200) NOT NULL,
    details JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Cost tracking per agent
CREATE TABLE agent_costs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_id VARCHAR(32) NOT NULL REFERENCES agents(id),
    input_tokens INTEGER DEFAULT 0,
    output_tokens INTEGER DEFAULT 0,
    cost_usd DECIMAL(10, 6) DEFAULT 0,
    model VARCHAR(100) DEFAULT 'gemini-1.5-flash',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_task_assignments_agent ON task_assignments(agent_id);
CREATE INDEX idx_task_assignments_task ON task_assignments(task_id);
CREATE INDEX idx_messages_from ON messages(from_agent);
CREATE INDEX idx_messages_to ON messages(to_agent);
CREATE INDEX idx_messages_created ON messages(created_at DESC);
CREATE INDEX idx_activity_log_agent ON activity_log(agent_id);
CREATE INDEX idx_activity_log_created ON activity_log(created_at DESC);
CREATE INDEX idx_agent_costs_agent ON agent_costs(agent_id);

-- Seed the 8 agents
-- Seed the 8 agents
INSERT INTO agents (id, name, role, current_room, status, tech_stack, avatar_color) VALUES
    ('orchestrator', 'Orchestrator', 'CEO / Orchestrator', 'Private Office', 'Idle',
     ARRAY['create_task', 'assign_agent', 'schedule_meeting'], '#8b5cf6'),
    ('crawler', 'Crawler', 'Content Crawler', 'Desks', 'Idle',
     ARRAY['search_web', 'scrape_url', 'summarize_text'], '#3b82f6'),
    ('researcher', 'Researcher', 'Deep Researcher', 'Desks', 'Idle',
     ARRAY['academic_search', 'competitor_analysis', 'read_pdf'], '#ec4899'),
    ('viral_engineer', 'Viral Engineer', 'Viral Engineer', 'Lounge', 'Idle',
     ARRAY['draft_tweet', 'analyze_sentiment', 'get_trending_topics'], '#f59e0b'),
    ('comms', 'Comms', 'Comms Interface', 'Desks', 'Idle',
     ARRAY['fetch_emails', 'draft_reply', 'send_newsletter'], '#10b981'),
    ('devops', 'DevOps', 'DevOps Monitor', 'Server Room', 'Idle',
     ARRAY['check_uptime', 'view_logs', 'restart_service'], '#ef4444'),
    ('archivist', 'Archivist', 'KB Organizer', 'Desks', 'Idle',
     ARRAY['update_notion', 'organize_files', 'create_doc'], '#06b6d4'),
    ('frontend_designer', 'Frontend Designer', 'Frontend Designer', 'Desks', 'Idle',
     ARRAY['generate_image', 'critique_ui', 'create_mockup'], '#f97316'),
    ('user', 'User', 'Human Administrator', 'Private Office', 'Idle',
     ARRAY[]::TEXT[], '#10b981');

-- Initialize the global office state
INSERT INTO office_state (id, state_json, version) VALUES (1, '{
    "global_status": "Idle",
    "default_room": "Desks",
    "day_started": false,
    "simulation_speed": 1.0
}', 0);
