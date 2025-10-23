import { useState, useEffect, useRef, useContext } from "react";
import AnnotationFormSchema from "@/assets/schema.json";
import { Form, FormHandle } from "@/components/form/Form";
import { Input } from "@/components/form/Input";
import { Textarea } from "@/components/form/Textarea";
import TypeaheadInput from "@/components/form/Typeahead.input";
import { AnnotationSchema } from "@/types/annotation-schema.interface";
import { AuthenticationContext } from "@/context/authentication.context";
import Toggle from "@/components/form/Toggle";
import { storage } from "#imports";
import { ISettings } from "@/types/settings.interface";
import Alert from "@/components/Alert";
import { useNavigate } from "react-router";

interface AnnotationData {
  selectedText: string;
  url: string;
}

export default function Create() {
  const { isAuthenticated, login, oauth } = useContext(AuthenticationContext);
  const formRef = useRef<FormHandle>(null);
  const [annotationData, setAnnotationData] = useState<AnnotationData | null>(
    null
  );
  const [settings, setSettings] = useState<ISettings>({ vocabularies: {} });
  const [isLoadingSettings, setIsLoadingSettings] = useState(true);
  const [errorMessages, setErrorMessages] = useState<string[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const storedSettings = await storage.getItem<ISettings>(
          "local:settings"
        );
        setSettings(storedSettings || { vocabularies: {} });
      } catch (error) {
        console.error("Failed to load settings:", error);
      } finally {
        setIsLoadingSettings(false);
      }
    };

    loadSettings();
  }, []);

  useEffect(() => {
    const loadPendingData = () => {
      const pendingData = sessionStorage.getItem("pendingAnnotation");

      if (pendingData) {
        const data = JSON.parse(pendingData) as AnnotationData;
        setAnnotationData(data);
        if (isAuthenticated) {
          sessionStorage.removeItem("pendingAnnotation");
        }
      }
    };

    loadPendingData();

    window.addEventListener("pendingAnnotationUpdated", loadPendingData);

    return () => {
      window.removeEventListener("pendingAnnotationUpdated", loadPendingData);
    };
  }, [isAuthenticated]);

  useEffect(() => {
    if (annotationData && formRef.current) {
      formRef.current.setValue("selectedText", annotationData.selectedText);
      formRef.current.setValue("resource", annotationData.url);
    }
  }, [annotationData]);

  // Load remembered choices when settings are loaded
  useEffect(() => {
    if (!isLoadingSettings && settings.rememberChoices && formRef.current) {
      Object.entries(settings.rememberChoices).forEach(([fieldName, value]) => {
        formRef.current?.setValue(fieldName, value);
      });
    }
  }, [isLoadingSettings, settings.rememberChoices]);

  const handleSubmit = async (data: Record<string, any>) => {
    setErrorMessages([]);

    if (!oauth || !oauth.identity_provider_identity) {
      console.error("Identifier not available");
      setErrorMessages([
        "User Identifier not available. Please try logging in again.",
      ]);
      return;
    }

    if (data.rememberChoices === true) {
      const comboboxFields = (AnnotationFormSchema as AnnotationSchema).fields
        .filter((field) => field.type === "combobox")
        .map((field) => field.name);

      const rememberChoices: Record<string, any> = {};
      comboboxFields.forEach((fieldName) => {
        if (
          data[fieldName] !== undefined &&
          data[fieldName] !== null &&
          data[fieldName] !== ""
        ) {
          rememberChoices[fieldName] = data[fieldName];
        }
      });

      try {
        const updatedSettings = {
          ...settings,
          rememberChoices,
        };
        await storage.setItem("local:settings", updatedSettings);
        setSettings(updatedSettings);
      } catch (error) {
        console.error("Failed to save remembered choices:", error);
      }
    } else if (data.rememberChoices === false && settings.rememberChoices) {
      try {
        const updatedSettings = {
          ...settings,
          rememberChoices: undefined,
        };
        await storage.setItem("local:settings", updatedSettings);
        setSettings(updatedSettings);
      } catch (error) {
        console.error("Failed to clear remembered choices:", error);
      }
    }

    try {
      const response = await fetch(
        import.meta.env.WXT_API_ENDPOINT + "/knowledge-base/annotation",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            ...data,
            submitter: oauth.identity_provider_identity,
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to create annotation: ${response.statusText}`);
      }

      const result = await response.json();
      console.log("Annotation created successfully:", result);

      if (annotationData) {
        sessionStorage.removeItem("pendingAnnotation");
        setAnnotationData(null);
      }

      if (data.rememberChoices === true && settings.rememberChoices) {
        // If rememberChoices is enabled, only reset non-combobox fields
        const fieldsToReset = (AnnotationFormSchema as AnnotationSchema).fields
          .filter((field) => field.type !== "combobox")
          .map((field) => field.name);

        // Reset those fields plus selectedText
        fieldsToReset.forEach((fieldName) => {
          formRef.current?.setValue(fieldName, "");
        });
        formRef.current?.setValue("selectedText", "");
      } else {
        // If rememberChoices is disabled, reset everything
        formRef.current?.reset();
      }
      navigate("/annotations");
    } catch (error) {
      console.error("Failed to create annotation:", error);
      setErrorMessages([
        "An unexpected error occurred while creating the annotation. Please try again.",
      ]);
    }
  };

  if (!isAuthenticated) {
    return (
      <div
        onClick={login}
        className="mx-2 my-12 border border-rda-500 rounded-md bg-white shadow cursor-pointer"
      >
        <p className="px-4 pt-4 text-base font-medium text-center">
          Please authenticate to create annotations.
        </p>
        <p className="text-rda-500 underline text-center font-medium text-base py-4 px-4">
          Login
        </p>
      </div>
    );
  }

  const FormFields = (AnnotationFormSchema as AnnotationSchema).fields.map(
    (field, index) => {
      switch (field.type) {
        case "text":
          return (
            <Input
              key={field.name + index}
              name={field.name}
              label={field.label}
              required={field.required}
              info={field.info}
              disabled={field.disabled}
            />
          );
        case "textarea":
          return (
            <Textarea
              key={field.name + index}
              name={field.name}
              label={field.label}
              required={field.required}
              info={field.info}
            />
          );
        case "combobox":
          if (field.type === "combobox" && field.vocabulary) {
            if (settings.vocabularies?.[field.name] === false) {
              return null;
            }
          }
          return (
            <TypeaheadInput
              key={field.name + index}
              name={field.name}
              label={field.label}
              info={field.info}
              datasource={field.vocabulary}
              required={field.required}
              value={field.defaultValue}
              multiple={field.multiple || false}
              vocabularyOptions={field.vocabularyOptions}
            />
          );
        default:
          return <p>Unsupported field type</p>;
      }
    }
  );

  FormFields.unshift(
    <Textarea
      rows={8}
      key="selectedText"
      name="selectedText"
      label="Annotated Fragment"
      required
      info="The text you selected on the page."
      disabled
    />
  );

  if (isLoadingSettings) {
    return <p className="mx-2 my-12">Loading...</p>;
  }

  return (
    <>
      {errorMessages.length > 0 && (
        <Alert title="Error Creating Annotation" messages={errorMessages} />
      )}
      <h2 className="text-xl mx-2 mt-6">Create Annotation</h2>
      <Form ref={formRef} onSubmit={handleSubmit}>
        <div className="mx-2 mt-4 space-y-4">{FormFields}</div>

        <div className="mx-2 my-4">
          <Toggle
            label={
              <div>
                <p className="font-medium text-gray-900">
                  Remember my choices for next time
                </p>
                <p className="text-gray-500">
                  This includes all vocabulary and keyword choices.
                </p>
              </div>
            }
            name="rememberChoices"
            defaultChecked={!!settings.rememberChoices}
          />
        </div>

        <div className="flex w-full mb-8">
          <button
            type="submit"
            className="mt-4 rounded-md w-full bg-rda-500 px-2.5 mx-2 py-1.5 text-sm font-semibold text-white shadow-xs hover:bg-rda-400 focus-visible:outline-2 cursor-pointer focus-visible:outline-offset-2 focus-visible:outline-rda-500"
          >
            Create Annotation
          </button>
        </div>
      </Form>
    </>
  );
}
