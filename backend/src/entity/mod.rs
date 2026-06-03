pub mod dashboard_schedules;
pub mod dashboard_snapshots;
pub mod dashboards;
pub mod permissions;
pub mod prelude;
pub mod role_permissions;
pub mod roles;
pub mod user_roles;
pub mod datasources;
pub mod users;

pub use dashboards::Entity as Dashboards;
pub use datasources::Entity as Datasources;
pub use permissions::Entity as Permissions;
pub use role_permissions::Entity as RolePermissions;
pub use roles::Entity as Roles;
pub use user_roles::Entity as UserRoles;
pub use users::Entity as Users;
