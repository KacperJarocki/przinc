module "name" {
  source          = "../name_generator"
  name_components = var.name_components
}

resource "azurerm_log_analytics_workspace" "this" {
  name                = "${var.name_components.service}${var.name_components.project_name}${var.name_components.environment}"
  resource_group_name = var.inputs.resource_group_name
  location            = var.inputs.location
  sku                 = "PerGB2018"
  retention_in_days   = 30
  tags = merge(
    {
      project     = var.name_components.project_name
      environment = var.name_components.environment
      service     = var.name_components.service
    },
    var.inputs.tags
  )
}

output "id" {
  value = azurerm_log_analytics_workspace.this.id
}
