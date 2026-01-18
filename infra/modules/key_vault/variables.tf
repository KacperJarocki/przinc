variable "name_components" {
  type = object({
    project_name = string
    environment  = string
    service      = string
    postfix      = optional(number, 0)
  })
}

variable "configuration" {
  type = object({
    sku_name                   = optional(string, "standard")
    enable_rbac_authorization  = optional(bool, true)
    purge_protection_enabled   = optional(bool, true)
    soft_delete_retention_days = optional(number, 90)

    public_network_access_enabled = optional(bool, true)
    network_default_action        = optional(string, "Allow")
    network_bypass                = optional(string, "AzureServices")

    create_key = optional(bool, false)
    key_name   = optional(string, "cmk")
    key_type   = optional(string, "RSA")
    key_size   = optional(number, 2048)
  })
  default = {}
}

variable "inputs" {
  type = object({
    resource_group_name        = string
    location                   = string
    tenant_id                  = string
    tags                       = optional(map(string), {})
    log_analytics_workspace_id = optional(string)
    private_endpoint = optional(object({
      enabled             = bool
      subnet_id           = string
      private_dns_zone_id = string
    }), { enabled = false, subnet_id = "", private_dns_zone_id = "" })
  })
}
