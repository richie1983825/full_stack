use actix_web::{
    dev::{forward_ready, Service, ServiceRequest, ServiceResponse, Transform},
    error::ErrorUnauthorized,
    http::header,
    Error, HttpMessage,
};
use futures_util::future::LocalBoxFuture;
use std::future::{ready, Ready};
use std::rc::Rc;
use uuid::Uuid;

use crate::config::Config;
use crate::models::Claims;
use crate::services::auth::verify_token;

#[derive(Clone)]
pub struct AuthMiddleware {
    cfg: Rc<Config>,
}

impl AuthMiddleware {
    pub fn new(cfg: Config) -> Self {
        Self { cfg: Rc::new(cfg) }
    }
}

impl<S, B> Transform<S, ServiceRequest> for AuthMiddleware
where
    S: Service<ServiceRequest, Response = ServiceResponse<B>, Error = Error> + 'static,
    S::Future: 'static,
    B: 'static,
{
    type Response = ServiceResponse<B>;
    type Error = Error;
    type InitError = ();
    type Transform = AuthMiddlewareService<S>;
    type Future = Ready<Result<Self::Transform, Self::InitError>>;

    fn new_transform(&self, service: S) -> Self::Future {
        ready(Ok(AuthMiddlewareService {
            service: Rc::new(service),
            cfg: self.cfg.clone(),
        }))
    }
}

pub struct AuthMiddlewareService<S> {
    service: Rc<S>,
    cfg: Rc<Config>,
}

impl<S, B> Service<ServiceRequest> for AuthMiddlewareService<S>
where
    S: Service<ServiceRequest, Response = ServiceResponse<B>, Error = Error> + 'static,
    S::Future: 'static,
    B: 'static,
{
    type Response = ServiceResponse<B>;
    type Error = Error;
    type Future = LocalBoxFuture<'static, Result<Self::Response, Self::Error>>;

    forward_ready!(service);

    fn call(&self, req: ServiceRequest) -> Self::Future {
        let service = self.service.clone();
        let cfg = self.cfg.clone();

        Box::pin(async move {
            let token = extract_bearer_token(req.request())
                .ok_or_else(|| ErrorUnauthorized("missing authorization token"))?;

            let claims = verify_token(&token, &cfg)
                .map_err(|_| ErrorUnauthorized("invalid or expired token"))?;

            req.extensions_mut().insert(claims);
            service.call(req).await
        })
    }
}

pub fn extract_bearer_token(req: &actix_web::HttpRequest) -> Option<String> {
    req.headers()
        .get(header::AUTHORIZATION)?
        .to_str()
        .ok()?
        .strip_prefix("Bearer ")
        .map(str::to_string)
}

pub fn get_claims(req: &actix_web::HttpRequest) -> Option<Claims> {
    req.extensions().get::<Claims>().cloned()
}

pub fn get_user_id(req: &actix_web::HttpRequest) -> Option<Uuid> {
    get_claims(req)
        .and_then(|claims| Uuid::parse_str(&claims.sub).ok())
}
