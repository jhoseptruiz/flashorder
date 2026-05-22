-- ============================================================
-- FlashOrder POS -- Schema de Base de Datos
-- PostgreSQL 15
-- ============================================================

-- Limpiar si se re-ejecuta el script
DROP SCHEMA IF EXISTS public CASCADE;
CREATE SCHEMA public;

-- ============================================================
-- TIPOS ENUMERADOS
-- ============================================================

-- Comportamiento logico de una categoria en el motor de composicion
CREATE TYPE category_behavior AS ENUM ('base', 'complemento', 'independiente');

-- Ciclo de vida de una orden
CREATE TYPE order_status AS ENUM (
    'pendiente_uber',
    'pendiente',
    'en_cocina',
    'empacado',
    'entregado'
);

-- Canal de origen de la orden
CREATE TYPE order_channel AS ENUM ('local', 'uber_eats');

-- ============================================================
-- CLIENTES
-- ============================================================

CREATE TABLE customers (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name   VARCHAR(150) NOT NULL,
    phone       VARCHAR(20),
    email       VARCHAR(150),
    notes       TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- CATALOGO: CATEGORIAS
-- ============================================================

CREATE TABLE categories (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name         VARCHAR(100) NOT NULL,
    behavior     category_behavior NOT NULL DEFAULT 'independiente',
    display_order INT NOT NULL DEFAULT 0,
    is_active    BOOLEAN NOT NULL DEFAULT TRUE,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- CATALOGO: PRODUCTOS
-- ============================================================

CREATE TABLE products (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id      UUID NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
    name             VARCHAR(150) NOT NULL,
    description      TEXT,
    -- Si es TRUE, el producto se arma con el asistente de composicion
    is_composite     BOOLEAN NOT NULL DEFAULT FALSE,
    -- Solo aplica cuando is_composite = TRUE
    -- Apunta a la categoria cuyo behavior = 'base'
    base_category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    is_active        BOOLEAN NOT NULL DEFAULT TRUE,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_composite_needs_base
        CHECK (is_composite = FALSE OR base_category_id IS NOT NULL)
);

-- ============================================================
-- CATALOGO: VARIANTES DE PRODUCTO
-- ============================================================

-- Cada producto puede tener una o mas variantes (ej: tamanos, sabores fijos)
CREATE TABLE product_variants (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id   UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    name         VARCHAR(100) NOT NULL,   -- ej: "Personal", "Familiar"
    price        NUMERIC(10,2) NOT NULL CHECK (price >= 0),
    -- Clave de mapeo para ordenes externas (Uber Eats)
    external_id  VARCHAR(100) UNIQUE,
    is_active    BOOLEAN NOT NULL DEFAULT TRUE,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- MOTOR DE COMPOSICION: REGLAS
-- ============================================================

-- Define cuantos componentes de cada categoria puede/debe
-- tener un producto compuesto
CREATE TABLE composition_rules (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    -- Producto compuesto al que aplica esta regla
    product_id          UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    -- Categoria de componente que se esta limitando
    component_category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
    min_quantity        INT NOT NULL DEFAULT 0 CHECK (min_quantity >= 0),
    max_quantity        INT NOT NULL DEFAULT 1 CHECK (max_quantity >= 1),
    -- Orden de aparicion en el asistente del frontend
    step_order          INT NOT NULL DEFAULT 0,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE (product_id, component_category_id),
    CONSTRAINT chk_min_lte_max CHECK (min_quantity <= max_quantity)
);

-- ============================================================
-- ORDENES
-- ============================================================

CREATE TABLE orders (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id     UUID REFERENCES customers(id) ON DELETE SET NULL,
    channel         order_channel NOT NULL DEFAULT 'local',
    status          order_status NOT NULL DEFAULT 'pendiente',
    -- ID externo de la plataforma (ej: ID de Uber Eats)
    external_ref    VARCHAR(150) UNIQUE,
    -- Fecha y hora de retiro o entrega pactada
    scheduled_at    TIMESTAMPTZ,
    notes           TEXT,
    -- Gestion de abonos
    total_amount    NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (total_amount >= 0),
    deposit_amount  NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (deposit_amount >= 0),
    -- balance_due se calcula: total_amount - deposit_amount
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_deposit_lte_total CHECK (deposit_amount <= total_amount)
);

-- ============================================================
-- ITEMS DE ORDEN
-- ============================================================

-- Cada fila es un componente individual de la orden.
-- Para productos compuestos, todos los componentes comparten el mismo group_id.
-- Para productos simples, group_id = NULL.
CREATE TABLE order_items (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id                UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    -- Referencia a la variante elegida (puede ser NULL si fue eliminada del catalogo)
    product_variant_id      UUID REFERENCES product_variants(id) ON DELETE SET NULL,
    -- Snapshot del nombre comercial al momento de la venta (historial inmutable)
    product_name_snapshot   VARCHAR(200) NOT NULL,
    quantity                INT NOT NULL DEFAULT 1 CHECK (quantity > 0),
    unit_price              NUMERIC(10,2) NOT NULL CHECK (unit_price >= 0),
    -- UUID compartido entre todos los componentes de un producto compuesto
    group_id                UUID,
    -- Si es componente de un armado, referencia al item padre (la base)
    parent_item_id          UUID REFERENCES order_items(id) ON DELETE CASCADE,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- INDICES
-- ============================================================

CREATE INDEX idx_orders_status          ON orders(status);
CREATE INDEX idx_orders_channel         ON orders(channel);
CREATE INDEX idx_orders_created_at      ON orders(created_at DESC);
CREATE INDEX idx_order_items_order_id   ON order_items(order_id);
CREATE INDEX idx_order_items_group_id   ON order_items(group_id);
CREATE INDEX idx_products_category_id   ON products(category_id);
CREATE INDEX idx_variants_product_id    ON product_variants(product_id);
CREATE INDEX idx_variants_external_id   ON product_variants(external_id);

-- ============================================================
-- TRIGGER: actualizar updated_at en orders automaticamente
-- ============================================================

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_orders_updated_at
    BEFORE UPDATE ON orders
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();
