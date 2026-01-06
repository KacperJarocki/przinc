module "name" {
  source = "../name_generator"
}
resource "azurerm_resource_group" "rg" {
  name     = module.name.name
  location = "West Europe"
}
output "id" {
  value = azurerm_resource_group.rg.id
}
