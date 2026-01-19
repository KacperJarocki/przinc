module "name" {
  source          = "../name_generator"
  name_components = var.name_components
}

resource "azurerm_public_ip" "this" {
  name                = "${module.name.name}-pip"
  location            = var.inputs.location
  resource_group_name = var.inputs.resource_group_name

  allocation_method = "Static"
  sku               = "Standard"

  tags = {
    project     = var.name_components.project_name
    environment = var.name_components.environment
  }
}

resource "azurerm_application_gateway" "this" {
  name                = module.name.name
  location            = var.inputs.location
  resource_group_name = var.inputs.resource_group_name

  sku {
    name     = var.configuration.sku_name
    tier     = var.configuration.sku_tier
    capacity = var.configuration.capacity
  }

  ssl_policy {
    policy_type = "Predefined"
    policy_name = "AppGwSslPolicy20220101"
  }

  waf_configuration {
    enabled          = true
    firewall_mode    = "Detection"
    rule_set_type    = "OWASP"
    rule_set_version = "3.2"
  }
  gateway_ip_configuration {
    name      = "appgw-ipcfg"
    subnet_id = var.inputs.subnet_id
  }

  frontend_ip_configuration {
    name                 = "public-feip"
    public_ip_address_id = azurerm_public_ip.this.id
  }

  frontend_port {
    name = "http-80"
    port = 80
  }


  backend_address_pool {
    name = "placeholder-backend"
  }

  backend_http_settings {
    name                  = "placeholder-http"
    protocol              = "Http"
    port                  = 80
    request_timeout       = 30
    cookie_based_affinity = "Disabled"
  }

  http_listener {
    name                           = "placeholder-listener"
    frontend_ip_configuration_name = "public-feip"
    frontend_port_name             = "http-80"
    protocol                       = "Http"
  }

  request_routing_rule {
    name                       = "placeholder-rule"
    rule_type                  = "Basic"
    http_listener_name         = "placeholder-listener"
    backend_address_pool_name  = "placeholder-backend"
    backend_http_settings_name = "placeholder-http"
    priority                   = 10
  }

  enable_http2 = var.configuration.enable_http2

  tags = {
    project     = var.name_components.project_name
    environment = var.name_components.environment
  }
}

output "id" {
  value = azurerm_application_gateway.this.id
}

output "name" {
  value = azurerm_application_gateway.this.name
}

output "public_ip" {
  value = azurerm_public_ip.this.ip_address
}
