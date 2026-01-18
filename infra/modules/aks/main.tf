data "azurerm_client_config" "current" {}

module "name" {
  source          = "../name_generator"
  name_components = var.name_components
}

resource "azurerm_kubernetes_cluster" "this" {
  name                = module.name.name
  location            = var.inputs.location
  resource_group_name = var.inputs.resource_group_name
  dns_prefix          = module.name.name

  private_cluster_enabled = false

  oidc_issuer_enabled       = true
  workload_identity_enabled = true

  role_based_access_control_enabled = true
  local_account_disabled            = true
  azure_active_directory_role_based_access_control {
    managed            = true
    azure_rbac_enabled = true
  }
  network_profile {
    network_plugin      = "azure"
    network_plugin_mode = "overlay"
    outbound_type       = "loadBalancer"

    pod_cidr       = "10.244.0.0/16"
    service_cidr   = "10.1.0.0/16"
    dns_service_ip = "10.1.0.10"
  }

  default_node_pool {
    name           = "system"
    vm_size        = var.configuration.node_vm_size
    vnet_subnet_id = var.inputs.subnet_id
    type           = "VirtualMachineScaleSets"
    max_pods       = 30

    node_count          = var.configuration.enable_autoscale ? null : var.configuration.node_count
    enable_auto_scaling = var.configuration.enable_autoscale
    min_count           = var.configuration.enable_autoscale ? var.configuration.min_count : null
    max_count           = var.configuration.enable_autoscale ? var.configuration.max_count : null
  }

  identity { type = "SystemAssigned" }

  dynamic "oms_agent" {
    for_each = var.inputs.log_analytics_id != null ? [1] : []
    content {
      log_analytics_workspace_id = var.inputs.log_analytics_id
    }
  }
  tags = merge({
    project     = var.name_components.project_name
    environment = var.name_components.environment
    service     = var.name_components.service
  }, var.inputs.tags)
}

module "acr" {
  source = "../acr"

  name_components = {
    project_name = var.name_components.project_name
    environment  = var.name_components.environment
    service      = "acr"
  }

  configuration = {}

  inputs = {
    resource_group_name = var.inputs.resource_group_name
    location            = var.inputs.location
    subnet_id           = var.inputs.acr_subnet_id
    private_dns_zone_id = var.inputs.acr_private_dns_zone_id
  }
}

resource "azurerm_role_assignment" "acr_role" {
  principal_id                     = azurerm_kubernetes_cluster.this.kubelet_identity[0].object_id
  role_definition_name             = "AcrPull"
  scope                            = module.acr.id
  skip_service_principal_aad_check = true
}

module "keyvault" {
  source = "../key_vault"

  name_components = {
    project_name = var.name_components.project_name
    environment  = var.name_components.environment
    service      = "kv"
  }

  configuration = {
    enable_rbac_authorization  = true
    purge_protection_enabled   = true
    soft_delete_retention_days = 90

    public_network_access_enabled = false
    network_default_action        = "Deny"
    network_bypass                = "AzureServices"
  }

  inputs = {
    resource_group_name = var.inputs.resource_group_name
    location            = var.inputs.location
    tenant_id           = data.azurerm_client_config.current.tenant_id
    tags                = var.inputs.tags

    log_analytics_workspace_id = var.inputs.log_analytics_id

    private_endpoint = {
      enabled             = true
      subnet_id           = var.inputs.kv_private_endpoint_subnet_id
      private_dns_zone_id = var.inputs.kv_private_dns_zone_id
    }
  }
}

resource "azurerm_role_assignment" "aks_kms_crypto_user" {
  scope                = module.keyvault.id
  role_definition_name = "Key Vault Crypto User"
  principal_id         = azurerm_kubernetes_cluster.this.identity[0].principal_id
}

resource "azurerm_user_assigned_identity" "kv_reader" {
  name                = "uami-kv-reader-${azurerm_kubernetes_cluster.this.name}"
  location            = var.inputs.location
  resource_group_name = var.inputs.resource_group_name
}

resource "azurerm_role_assignment" "kv_reader_secrets_user" {
  scope                = module.keyvault.id
  role_definition_name = "Key Vault Secrets User"
  principal_id         = azurerm_user_assigned_identity.kv_reader.principal_id
}

resource "azurerm_federated_identity_credential" "kv_reader" {
  name                = "fic-kv-reader"
  resource_group_name = var.inputs.resource_group_name
  parent_id           = azurerm_user_assigned_identity.kv_reader.id
  issuer              = azurerm_kubernetes_cluster.this.oidc_issuer_url
  subject             = "system:serviceaccount:${var.inputs.kv_reader_namespace}:${var.inputs.kv_reader_serviceaccount}"
  audience            = ["api://AzureADTokenExchange"]
}
resource "azurerm_role_assignment" "kv_admin_me" {
  scope                = module.keyvault.id
  role_definition_name = "Key Vault Administrator"
  principal_id         = data.azurerm_client_config.current.object_id
}

resource "azurerm_role_assignment" "aks_admin_me" {
  scope                = azurerm_kubernetes_cluster.this.id
  role_definition_name = "Azure Kubernetes Service RBAC Cluster Admin"
  principal_id         = data.azurerm_client_config.current.object_id
}
