module "name" {
  source          = "../name_generator"
  name_components = var.name_components
}

resource "azurerm_kubernetes_cluster" "this" {
  name                    = module.name.name
  location                = var.inputs.location
  resource_group_name     = var.inputs.resource_group_name
  private_cluster_enabled = false
  dns_prefix              = module.name.name
  network_profile {
    network_plugin      = "azure"
    network_plugin_mode = "overlay"
    outbound_type       = "loadBalancer"
    pod_cidr            = "10.244.0.0/16"
    service_cidr        = "10.1.0.0/16"
    dns_service_ip      = "10.1.0.10"
  }

  default_node_pool {
    name           = "system"
    vm_size        = var.configuration.node_vm_size
    node_count     = var.configuration.enable_autoscale ? null : var.configuration.node_count
    vnet_subnet_id = var.inputs.subnet_id
    type           = "VirtualMachineScaleSets"
    max_pods       = 30
  }

  identity {
    type = "SystemAssigned"
  }

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
