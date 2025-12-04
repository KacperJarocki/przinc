locals {
  project = lower(replace(var.name_components.project_name, "/[^a-zA-Z0-9-]/", ""))
  env     = lower(replace(var.name_components.environment, "/[^a-zA-Z0-9-]/", ""))
  service = lower(replace(var.name_components.service, "/[^a-zA-Z0-9-]/", ""))

  postfix_enabled = var.name_components.postfix > 0

  postfix_str = local.postfix_enabled ? format("-%02d", var.name_components.postfix) : ""

  generated_name = "${local.project}-${local.env}-${local.service}${local.postfix_str}"
}

output "name" {
  value = local.generated_name
}
