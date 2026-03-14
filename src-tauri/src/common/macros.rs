/// Generates `FromStr`, `Display`, and `as_str()` for string-backed enums.
///
/// Eliminates the repetitive hand-written `FromStr` + `to_str` boilerplate
/// that was duplicated across every enum in the domain layer.
///
/// # Usage
///
/// ```ignore
/// str_enum! {
///     #[derive(Debug, Clone, PartialEq, Serialize, Type, SpectaType)]
///     pub enum RoundStatus {
///         Planned => "planned" | "upcoming",
///         InProgress => "in_progress",
///     }
///     default: Planned
/// }
/// ```
///
/// The first literal is the canonical string (used by `as_str()`/`Display`).
/// Additional `| "alias"` strings are accepted by `FromStr` but never produced.
macro_rules! str_enum {
    (
        $(#[$meta:meta])*
        $vis:vis enum $Name:ident {
            $(
                $(#[$variant_meta:meta])*
                $Variant:ident => $str:literal $(| $alias:literal)*
            ),+ $(,)?
        }
        default: $Default:ident
    ) => {
        $(#[$meta])*
        $vis enum $Name {
            $($(#[$variant_meta])* $Variant),+
        }

        impl $Name {
            pub fn as_str(&self) -> &'static str {
                match self {
                    $($Name::$Variant => $str),+
                }
            }
        }

        impl std::fmt::Display for $Name {
            fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
                f.write_str(self.as_str())
            }
        }

        impl std::str::FromStr for $Name {
            type Err = String;

            fn from_str(s: &str) -> Result<Self, Self::Err> {
                Ok(match s {
                    $($str $(| $alias)* => $Name::$Variant,)+
                    _ => $Name::$Default,
                })
            }
        }
    };
}

pub(crate) use str_enum;
