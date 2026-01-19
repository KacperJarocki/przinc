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

locals {
  private_dns_zones           = try(var.configuration.private_dns_zones, {})
  private_dns_zone_vnet_links = distinct(try(var.configuration.private_dns_zone_vnet_links, []))
}

resource "azurerm_private_dns_zone" "pdns" {
  for_each            = local.private_dns_zones
  name                = each.value
  resource_group_name = var.inputs.resource_group_name

  tags = merge({
    project     = var.name_components.project_name
    environment = var.name_components.environment
    service     = var.name_components.service
  }, var.inputs.tags)
}

resource "azurerm_private_dns_zone_virtual_network_link" "pdns_link_this_vnet" {
  for_each = local.private_dns_zones

  name                  = "pdns-${each.key}-link-this"
  resource_group_name   = var.inputs.resource_group_name
  private_dns_zone_name = azurerm_private_dns_zone.pdns[each.key].name
  virtual_network_id    = azurerm_virtual_network.vnet.id

  registration_enabled = false

  tags = merge({
    project     = var.name_components.project_name
    environment = var.name_components.environment
    service     = var.name_components.service
  }, var.inputs.tags)
}

resource "azurerm_private_dns_zone_virtual_network_link" "pdns_link_extra_vnets" {
  for_each = {
    for pair in setproduct(keys(local.private_dns_zones), local.private_dns_zone_vnet_links) :
    "${pair[0]}|${pair[1]}" => {
      zone_key = pair[0]
      vnet_id  = pair[1]
    }
  }

  name                  = "pdns-${each.value.zone_key}-link-${substr(sha1(each.value.vnet_id), 0, 6)}"
  resource_group_name   = var.inputs.resource_group_name
  private_dns_zone_name = azurerm_private_dns_zone.pdns[each.value.zone_key].name
  virtual_network_id    = each.value.vnet_id

  registration_enabled = false

  tags = merge({
    project     = var.name_components.project_name
    environment = var.name_components.environment
    service     = var.name_components.service
  }, var.inputs.tags)
}

output "subnets" {
  value = {
    for k, s in azurerm_subnet.subnet :
    k => {
      id       = s.id
      name     = s.name
      prefixes = s.address_prefixes
    }
  }
}

output "private_dns_zone_ids" {
  value = { for k, z in azurerm_private_dns_zone.pdns : k => z.id }
}

output "private_dns_zone_names" {
  value = { for k, z in azurerm_private_dns_zone.pdns : k => z.name }
}
