variable "name_components" {
  type = object({
    project_name = string
    environment  = string
    service      = string
  })
}

variable "configuration" {
  type = object({
    capacity     = optional(number, 1)
    sku_name     = optional(string, "WAF_v2")
    sku_tier     = optional(string, "WAF_v2")
    enable_http2 = optional(bool, true)
  })
}
variable "inputs" {
  type = object({
    location            = string
    resource_group_name = string
    subnet_id           = string
  })
}

