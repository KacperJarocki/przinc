module "name" {
  source          = "../name_generator"
  name_components = var.name_components
}

resource "azurerm_kubernetes_cluster" "this" {
  name                = module.name.name
  location            = var.inputs.location
  resource_group_name = var.inputs.resource_group_name

  kubernetes_version      = var.configuration.kubernetes_version
  private_cluster_enabled = false

  network_profile {
    network_plugin = "azure"
    outbound_type  = "loadBalancer"
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
