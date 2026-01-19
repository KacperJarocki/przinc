module "name" {
  source          = "../name_generator"
  name_components = var.name_components
}

resource "azurerm_key_vault" "this" {
  name                = "${module.name.name}-1"
  location            = var.inputs.location
  resource_group_name = var.inputs.resource_group_name
  tenant_id           = var.inputs.tenant_id

  sku_name = lower(var.configuration.sku_name)

  enable_rbac_authorization  = var.configuration.enable_rbac_authorization
  purge_protection_enabled   = var.configuration.purge_protection_enabled
  soft_delete_retention_days = var.configuration.soft_delete_retention_days

  public_network_access_enabled = var.configuration.public_network_access_enabled

  network_acls {
    default_action = var.configuration.network_default_action
    bypass         = var.configuration.network_bypass
  }

  tags = merge({
    project     = var.name_components.project_name
    environment = var.name_components.environment
    service     = var.name_components.service
  }, var.inputs.tags)
}

resource "azurerm_key_vault_key" "cmk" {
  count        = var.configuration.create_key ? 1 : 0
  name         = var.configuration.key_name
  key_vault_id = azurerm_key_vault.this.id

  key_type = var.configuration.key_type
  key_size = var.configuration.key_size

  key_opts = ["encrypt", "decrypt", "wrapKey", "unwrapKey", "sign", "verify"]
}

resource "azurerm_monitor_diagnostic_setting" "this" {
  name                       = "diag-${module.name.name}"
  target_resource_id         = azurerm_key_vault.this.id
  log_analytics_workspace_id = var.inputs.log_analytics_workspace_id

  enabled_log {
    category = "AuditEvent"
  }

  metric {
    category = "AllMetrics"
  }
}

resource "azurerm_private_endpoint" "this" {
  name                = "pe-${module.name.name}"
  location            = var.inputs.location
  resource_group_name = var.inputs.resource_group_name
  subnet_id           = var.inputs.private_endpoint.subnet_id

  private_service_connection {
    name                           = "psc-${module.name.name}"
    private_connection_resource_id = azurerm_key_vault.this.id
    is_manual_connection           = false
    subresource_names              = ["vault"]

  }
  private_dns_zone_group {
    name                 = "default"
    private_dns_zone_ids = [var.inputs.private_endpoint.private_dns_zone_id]
  }
  tags = merge({
    project     = var.name_components.project_name
    environment = var.name_components.environment
    service     = var.name_components.service
  }, var.inputs.tags)
}

output "id" {
  value = azurerm_key_vault.this.id
}

output "name" {
  value = azurerm_key_vault.this.name
}

output "vault_uri" {
  value = azurerm_key_vault.this.vault_uri
}

output "cmk_key_id" {
  value       = var.configuration.create_key ? azurerm_key_vault_key.cmk[0].id : null
  description = "Key Vault key id (if create_key=true)"
}
