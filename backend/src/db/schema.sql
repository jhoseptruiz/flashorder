-- ============================================================
-- FlashOrder POS -- Schema de Base de Datos
-- Basado en el MER oficial del proyecto (semana 2)
-- PostgreSQL 15
-- ============================================================

-- Limpiar si se re-ejecuta el script
DROP SCHEMA IF EXISTS public CASCADE;
CREATE SCHEMA public;

-- ============================================================
-- TIPOS ENUMERADOS
-- ============================================================

-- Roles del sistema (RBAC)
CREATE TYPE user_role AS ENUM ('admin', 'empleado', 'cocinero');

-- Comportamiento logico de una categoria en el motor de composicion
CREATE TYPE category_behavior AS ENUM ('base', 'complemento', 'independiente');

-- Canal de origen de la orden
CREATE TYPE order_source AS ENUM ('local', 'uber_eats');

-- Ciclo de vida de una orden
CREATE TYPE order_status AS ENUM (
    'pendiente_uber',
    'pendiente',
    'en_cocina',
    'empacado',
    'entregado'
);

-- ============================================================
-- IDENTIDAD Y ACCESO (RBAC)
-- ============================================================

CREATE TABLE users (
    -- RUT unico como clave primaria (ej: 12345678-K)
    rut             VARCHAR(12) PRIMARY KEY,
    full_name       VARCHAR(150) NOT NULL,
    email           VARCHAR(150) NOT NULL UNIQUE,
    password_hash   VARCHAR(255) NOT NULL,
    role            user_role NOT NULL DEFAULT 'empleado',
    is_active       BOOLEAN NOT NULL DEFAULT TRUE
);

-- ============================================================
-- GESTION DE CLIENTES
-- ============================================================

CREATE TABLE customers (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name   VARCHAR(150) NOT NULL,
    email       VARCHAR(150),
    -- Telefono obligatorio segun MER
    phone       VARCHAR(20) NOT NULL
);

-- ============================================================
-- CATALOGO: CATEGORIAS
-- ============================================================

CREATE TABLE categories (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    -- Nombre unico segun MER
    name         VARCHAR(100) NOT NULL UNIQUE,
    behavior     category_behavior NOT NULL DEFAULT 'independiente',
    display_order INT NOT NULL DEFAULT 0,
    is_active    BOOLEAN NOT NULL DEFAULT TRUE
);

-- ============================================================
-- MOTOR DE COMPOSICION: REGLAS
-- ============================================================

-- Define que categorias pueden ser componentes de otra categoria base
-- y cuantos items minimo/maximo se permiten
CREATE TABLE composition_rules (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    -- Categoria madre (behavior = 'base')
    base_category_id      UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
    -- Categoria hija permitida como componente
    allowed_category_id   UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
    min_items             INT NOT NULL DEFAULT 0 CHECK (min_items >= 0),
    -- NULL significa sin limite maximo
    max_items             INT CHECK (max_items IS NULL OR max_items >= 1),
    -- Orden de aparicion en el asistente del frontend
    step_order            INT NOT NULL DEFAULT 0,

    UNIQUE (base_category_id, allowed_category_id),
    CONSTRAINT chk_min_lte_max
        CHECK (max_items IS NULL OR min_items <= max_items)
);

-- ============================================================
-- CATALOGO: PRODUCTOS
-- ============================================================

CREATE TABLE products (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name             VARCHAR(150) NOT NULL,
    category_id      UUID NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
    -- Si es TRUE, el producto se arma con el asistente de composicion
    is_composite     BOOLEAN NOT NULL DEFAULT FALSE,
    -- Solo aplica cuando is_composite = TRUE: categoria de inicio del asistente
    base_category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    -- ID para integracion directa con plataforma externa (ej: Uber Eats Item ID)
    external_id      VARCHAR(100) UNIQUE,
    is_active        BOOLEAN NOT NULL DEFAULT TRUE,

    CONSTRAINT chk_composite_needs_base
        CHECK (is_composite = FALSE OR base_category_id IS NOT NULL)
);

-- ============================================================
-- CATALOGO: VARIANTES DE PRODUCTO
-- ============================================================

CREATE TABLE product_variants (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id   UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    -- ej: "Familiar", "20 porciones", "Lata"
    variant_name VARCHAR(100) NOT NULL,
    -- Precio en CLP (entero, sin decimales)
    price        INTEGER NOT NULL CHECK (price >= 0),
    -- ID para integracion con plataforma externa (ej: Uber Eats Option ID)
    external_id  VARCHAR(100) UNIQUE,
    is_active    BOOLEAN NOT NULL DEFAULT TRUE
);

-- ============================================================
-- OPERACIONES: PEDIDOS
-- ============================================================

CREATE TABLE customer_orders (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    -- Null si el pedido viene de Uber Eats
    customer_id         UUID REFERENCES customers(id) ON DELETE SET NULL,
    -- RUT del cajero o empleado que gestionó el pedido
    created_by_rut      VARCHAR(12) REFERENCES users(rut) ON DELETE SET NULL,
    order_date          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- Fecha/hora de entrega o retiro pactada
    delivery_date       TIMESTAMPTZ,
    -- Total en CLP (entero)
    total_amount        BIGINT NOT NULL DEFAULT 0 CHECK (total_amount >= 0),
    -- Abono parcial registrado al momento del pedido
    deposit_amount      BIGINT NOT NULL DEFAULT 0 CHECK (deposit_amount >= 0),
    source              order_source NOT NULL DEFAULT 'local',
    -- ID externo de la plataforma (ej: UBER-123)
    external_order_id   VARCHAR(150) UNIQUE,
    status              order_status NOT NULL DEFAULT 'pendiente',
    notes               TEXT,
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_deposit_lte_total CHECK (deposit_amount <= total_amount),
    CONSTRAINT chk_uber_needs_external
        CHECK (source != 'uber_eats' OR external_order_id IS NOT NULL)
);

-- ============================================================
-- OPERACIONES: ITEMS DE PEDIDO
-- ============================================================

-- Cada fila es un componente individual del pedido.
-- Para productos compuestos, todos los componentes comparten el mismo group_id.
CREATE TABLE order_items (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id                UUID NOT NULL REFERENCES customer_orders(id) ON DELETE CASCADE,
    -- Variante vendida (puede quedar null si fue eliminada del catalogo)
    variant_id              UUID REFERENCES product_variants(id) ON DELETE SET NULL,
    -- UUID compartido entre todos los componentes de un producto compuesto
    group_id                UUID,
    -- Snapshot del nombre comercial al momento de la venta (historial inmutable)
    product_name_snapshot   VARCHAR(200) NOT NULL,
    quantity                INT NOT NULL DEFAULT 1 CHECK (quantity > 0),
    -- Precio cobrado en el momento de la venta (CLP)
    unit_price              INTEGER NOT NULL CHECK (unit_price >= 0),
    -- Subtotal calculado: quantity * unit_price
    subtotal                INTEGER NOT NULL CHECK (subtotal >= 0),
    -- ID de la linea en la plataforma externa (ej: Uber Eats)
    external_item_id        VARCHAR(100)
);

-- ============================================================
-- AUDITORIA Y CONFIGURACION DEL SISTEMA
-- ============================================================

CREATE TABLE audit_logs (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    -- RUT del usuario que realizo la accion
    user_rut        VARCHAR(12) REFERENCES users(rut) ON DELETE SET NULL,
    action          VARCHAR(20) NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
    table_affected  VARCHAR(100) NOT NULL,
    record_id       UUID,
    -- Estado anterior y nuevo del registro (JSONB para flexibilidad)
    old_data        JSONB,
    new_data        JSONB,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE system_configs (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    app_name                VARCHAR(150) NOT NULL DEFAULT 'FlashOrder',
    logo_path               VARCHAR(300),
    backup_interval_hours   INT NOT NULL DEFAULT 24 CHECK (backup_interval_hours > 0),
    backup_email            VARCHAR(150)
);

-- Registro inicial de configuracion del sistema
INSERT INTO system_configs (app_name) VALUES ('FlashOrder');

-- ============================================================
-- INDICES
-- ============================================================

CREATE INDEX idx_customer_orders_status      ON customer_orders(status);
CREATE INDEX idx_customer_orders_source      ON customer_orders(source);
CREATE INDEX idx_customer_orders_order_date  ON customer_orders(order_date DESC);
CREATE INDEX idx_customer_orders_customer_id ON customer_orders(customer_id);
CREATE INDEX idx_order_items_order_id        ON order_items(order_id);
CREATE INDEX idx_order_items_group_id        ON order_items(group_id);
CREATE INDEX idx_products_category_id        ON products(category_id);
CREATE INDEX idx_variants_product_id         ON product_variants(product_id);
CREATE INDEX idx_audit_logs_user_rut         ON audit_logs(user_rut);
CREATE INDEX idx_audit_logs_created_at       ON audit_logs(created_at DESC);

-- ============================================================
-- TRIGGER: actualizar updated_at en customer_orders automaticamente
-- ============================================================

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_orders_updated_at
    BEFORE UPDATE ON customer_orders
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();
