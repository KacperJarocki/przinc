module "name" {
  source          = "../name_generator"
  name_components = var.name_components
}

resource "azurerm_virtual_network" "vnet" {
  name                = module.name.name
  address_space       = var.configuration.vnet_address_space
  location            = var.inputs.location
  resource_group_name = var.inputs.resource_group_name
  tags = merge({
    project     = var.name_components.project_name
    environment = var.name_components.environment
    service     = var.name_components.service
  }, var.inputs.tags)

}

resource "azurerm_subnet" "subnet" {
  for_each             = var.configuration.subnets
  name                 = "${module.name.name}-${each.key}"
  resource_group_name  = var.inputs.resource_group_name
  virtual_network_name = azurerm_virtual_network.vnet.name
  address_prefixes     = each.value.subnet_address_prefixes
}
