module "name" {
  source          = "../name_generator"
  name_components = var.name_components
}

resource "azurerm_container_registry" "acr" {
  name                          = "${var.name_components.service}${var.name_components.project_name}${var.name_components.environment}"
  resource_group_name           = var.inputs.resource_group_name
  location                      = var.inputs.location
  sku                           = "Premium"
  admin_enabled                 = false
  public_network_access_enabled = false
  tags = merge(
    {
      project     = var.name_components.project_name
      environment = var.name_components.environment
      service     = var.name_components.service
    },
    var.inputs.tags
  )
}

resource "azurerm_private_endpoint" "acr" {
  name                = "${module.name.name}-acr-pe"
  location            = var.inputs.location
  resource_group_name = var.inputs.resource_group_name
  subnet_id           = var.inputs.subnet_id
  tags                = var.inputs.tags

  private_service_connection {
    name                           = "acr-priv-conn"
    private_connection_resource_id = azurerm_container_registry.acr.id
    subresource_names              = ["registry"]
    is_manual_connection           = false
  }
  private_dns_zone_group {
    name                 = "default"
    private_dns_zone_ids = [var.inputs.private_dns_zone_id]
  }
}

resource "azurerm_container_registry_agent_pool" "agent_pool" {
  name                      = "ag${var.name_components.project_name}${var.name_components.environment}"
  resource_group_name       = var.inputs.resource_group_name
  location                  = var.inputs.location
  container_registry_name   = azurerm_container_registry.acr.name
  virtual_network_subnet_id = var.inputs.subnet_id
  tags                      = var.inputs.tags
}

output "id" {
  value = azurerm_container_registry.acr.id
}
