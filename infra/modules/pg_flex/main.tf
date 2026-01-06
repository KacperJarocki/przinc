module "name" {
  source          = "../name_generator"
  name_components = var.name_components
}
resource "azurerm_private_dns_zone" "pdns" {
  name                = "${module.name.name}.postgres.database.azure.com"
  resource_group_name = var.inputs.resource_group_name
}

resource "azurerm_private_dns_zone_virtual_network_link" "link" {
  name                  = "exampleVnetZone.com"
  private_dns_zone_name = azurerm_private_dns_zone.pdns.name
  virtual_network_id    = data.azurerm_virtual_network.vnet.id
  resource_group_name   = var.inputs.resource_group_name
}

resource "azurerm_postgresql_flexible_server" "example" {
  name                          = module.name.name
  resource_group_name           = var.inputs.resource_group_name
  location                      = var.inputs.location
  version                       = "15"
  delegated_subnet_id           = data.azurerm_subnet.snet.id
  private_dns_zone_id           = azurerm_private_dns_zone.pdns.id
  public_network_access_enabled = false
  administrator_login           = "psqladmin"
  administrator_password        = "H@Sh1CoR3!"
  zone                          = "1"

  storage_mb   = 32768
  storage_tier = "P30"

  sku_name   = "GP_Standard_D4s_v3"
  depends_on = [azurerm_private_dns_zone_virtual_network_link.link]

}
