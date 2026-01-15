module "name" {
  source          = "../name_generator"
  name_components = var.name_components
}
resource "azurerm_resource_group" "rg" {
  name     = module.name.name
  location = "West Europe"
  tags = merge({
    project     = var.name_components.project_name
    environment = var.name_components.environment
    service     = var.name_components.service
  }, var.inputs.tags)
}

output "id" {
  value = azurerm_resource_group.rg.id
}

output "name" {
  value = azurerm_resource_group.rg.name
}

output "location" {
  value = azurerm_resource_group.rg.location
}
