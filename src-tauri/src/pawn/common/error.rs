use serde::Serialize;
use specta::{
    DataType, Generics, NamedType, SpectaID,
    datatype::{PrimitiveType, reference::reference},
    internal::construct::{
        data_type_reference, field, impl_location, named_data_type, sid, r#struct, struct_named,
    },
};
use thiserror::Error;

#[allow(dead_code)]
#[derive(Debug, Error)]
/// Global error for all Pawn operations.
///
/// **Note** that [`serde::Serialize`] is manually implemented for this enum, so
/// the output data might be different from what you expected.
pub enum PawnError {
    #[error(transparent)]
    /// Represents all sqlx related errors.
    Database(#[from] sqlx::Error),

    #[error(transparent)]
    /// Represent all filesystem related errors.
    Io(#[from] std::io::Error),

    #[error(transparent)]
    /// Represents tauri runtime's errors.
    TauriError(#[from] tauri::Error),

    #[error(transparent)]
    /// Represents serde's serialization/deserialization errors.
    SerdeError(#[from] serde_json::Error),

    #[error("Invalid input: {0}")]
    /// Represents validation errors for user input.
    InvalidInput(String),

    #[error("Not found: {0}")]
    /// Represents cases where requested resource is not found.
    NotFound(String),

    #[error("Business logic error: {0}")]
    /// Represents business logic violations.
    BusinessLogic(String),

    #[error("Validation error: {0}")]
    /// Represents validation errors for game results.
    ValidationError(String),

    #[error("PDF generation error: {0}")]
    /// Represents PDF generation errors.
    PdfError(String),

    #[error("Excel generation error: {0}")]
    /// Represents Excel generation errors.
    ExcelError(String),
}

// PDF error conversions
impl From<printpdf::Error> for PawnError {
    fn from(err: printpdf::Error) -> Self {
        PawnError::PdfError(err.to_string())
    }
}

// Excel error conversions
impl From<rust_xlsxwriter::XlsxError> for PawnError {
    fn from(err: rust_xlsxwriter::XlsxError) -> Self {
        PawnError::ExcelError(err.to_string())
    }
}

impl specta::NamedType for PawnError {
    fn sid() -> SpectaID {
        sid("TxError", "tx_error")
    }
    fn named_data_type(
        _type_map: &mut specta::TypeMap,
        _generics: &[DataType],
    ) -> specta::datatype::NamedDataType {
        todo!()
    }
    fn definition_named_data_type(
        type_map: &mut specta::TypeMap,
    ) -> specta::datatype::NamedDataType {
        named_data_type(
            "TxError".into(),
            "Global error object returned by all commands".into(),
            None,
            Self::sid(),
            impl_location("some/impl/location"), // Idk what is the use of this.
            <Self as specta::Type>::inline(type_map, Generics::Definition),
        )
    }
}

impl specta::Type for PawnError {
    fn inline(
        _type_map: &mut specta::TypeMap,
        _generics: specta::Generics,
    ) -> specta::datatype::DataType {
        DataType::Struct(r#struct(
            "TxError".into(),
            Some(Self::sid()),
            vec![],
            struct_named(
                vec![
                    (
                        "message".into(),
                        field(
                            false,
                            false,
                            None,
                            "short message to be displayed in the toast".into(),
                            Some(DataType::Primitive(PrimitiveType::String)),
                        ),
                    ),
                    (
                        "details".into(),
                        field(
                            false,
                            false,
                            None,
                            "Detailed error message throwing by the low level api".into(),
                            Some(DataType::Primitive(PrimitiveType::String)),
                        ),
                    ),
                ],
                None,
            ),
        ))
    }
    fn reference(
        type_map: &mut specta::TypeMap,
        _: &[DataType],
    ) -> specta::datatype::reference::Reference {
        reference::<Self>(
            type_map,
            data_type_reference("TxError".into(), Self::sid(), vec![]),
        )
    }
}

#[derive(Serialize)]
#[serde(tag = "kind")]
#[serde(rename_all = "camelCase")]
enum TxErrorKind {
    Database { message: String, details: String },
    Io { message: String, details: String },
    TauriError { message: String, details: String },
    SerdeError { message: String, details: String },
    InvalidInput { message: String, details: String },
    NotFound { message: String, details: String },
    BusinessLogic { message: String, details: String },
    ValidationError { message: String, details: String },
}

impl Serialize for PawnError {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        let error_message = self.to_string();
        let error_kind = match self {
            Self::Database(_) => TxErrorKind::Database {
                message: "Error from database".to_string(),
                details: error_message,
            },
            Self::Io(_) => TxErrorKind::Io {
                message: "Filesystem IO error".to_string(),
                details: error_message,
            },
            Self::TauriError(_) => TxErrorKind::TauriError {
                message: "Tauri runtime error".to_string(),
                details: error_message,
            },
            Self::SerdeError(_) => TxErrorKind::SerdeError {
                message: "Serde serialization error".to_string(),
                details: error_message,
            },
            Self::InvalidInput(_) => TxErrorKind::InvalidInput {
                message: "Invalid input provided".to_string(),
                details: error_message,
            },
            Self::NotFound(_) => TxErrorKind::NotFound {
                message: "Resource not found".to_string(),
                details: error_message,
            },
            Self::BusinessLogic(_) => TxErrorKind::BusinessLogic {
                message: "Business logic violation".to_string(),
                details: error_message,
            },
            Self::ValidationError(_) => TxErrorKind::ValidationError {
                message: "Validation failed".to_string(),
                details: error_message,
            },
            Self::PdfError(_) => TxErrorKind::ValidationError {
                message: "PDF generation failed".to_string(),
                details: error_message,
            },
            Self::ExcelError(_) => TxErrorKind::ValidationError {
                message: "Excel generation failed".to_string(),
                details: error_message,
            },
        };
        error_kind.serialize(serializer)
    }
}
