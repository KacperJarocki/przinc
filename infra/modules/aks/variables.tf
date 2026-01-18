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
    node_vm_size     = string
    enable_autoscale = bool
    node_count       = number
    min_count        = number
    max_count        = number
  })
}

variable "inputs" {
  type = object({
    resource_group_name = string
    location            = string
    subnet_id           = string
    tags                = map(string)

    log_analytics_id = optional(string)

    acr_subnet_id           = string
    acr_private_dns_zone_id = string

    kv_private_endpoint_subnet_id = string
    kv_private_dns_zone_id        = string
    kv_reader_namespace           = string
    kv_reader_serviceaccount      = string

    appgw_subnet_id = string
  })
}
