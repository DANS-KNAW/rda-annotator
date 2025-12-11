import { useState, useEffect, useRef, useContext } from "react";
import AnnotationFormSchema from "@/assets/schema.json";
import { Form, FormHandle } from "@/components/form/Form";
import { Input } from "@/components/form/Input";
import { Textarea } from "@/components/form/Textarea";
import TypeaheadInput from "@/components/form/Typeahead.input";
import { AnnotationSchema } from "@/types/annotation-schema.interface";
import { AuthenticationContext } from "@/context/authentication.context";
import { usePendingAnnotation } from "@/context/pending-annotation.context";
import Toggle from "@/components/form/Toggle";
import { storage } from "#imports";
import { ISettings } from "@/types/settings.interface";
import Alert from "@/components/Alert";
import { useNavigate } from "react-router";
import { AnnotationTarget } from "@/types/selector.interface";
import { sendMessage } from "@/utils/messaging";
import { isDev } from "@/utils/is-dev";

/**
 * Extracts the selected text from an AnnotationTarget
 * Looks for a TextQuoteSelector and returns its exact text
 */
function getSelectedTextFromTarget(target: AnnotationTarget): string {
  const textQuoteSelector = target.selector.find(
    (s) => s.type === "TextQuoteSelector"
  );

  if (textQuoteSelector && textQuoteSelector.type === "TextQuoteSelector") {
    return textQuoteSelector.exact;
  }

  return "";
}

export default function Create() {
  const { isAuthenticated, login, oauth } = useContext(AuthenticationContext);
  const {
    pendingAnnotation,
    isLoading: isLoadingAnnotation,
    isReady: isAnnotationReady,
    clearPendingAnnotation,
  } = usePendingAnnotation();
  const formRef = useRef<FormHandle>(null);
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
    if (pendingAnnotation && formRef.current) {
      const selectedText = getSelectedTextFromTarget(pendingAnnotation.target);
      formRef.current.setValue("selectedText", selectedText);
      formRef.current.setValue("resource", pendingAnnotation.target.source);

      if (isDev) {
        console.log("[Create] Set form values:", {
          selectedText: selectedText.substring(0, 50) + "...",
          resource: pendingAnnotation.target.source,
        });
      }
    }
  }, [
    pendingAnnotation,
    isLoadingAnnotation,
    isAnnotationReady,
    isLoadingSettings,
  ]);

  useEffect(() => {
    if (!isLoadingSettings && settings.rememberChoices && formRef.current) {
      Object.entries(settings.rememberChoices).forEach(([fieldName, value]) => {
        formRef.current?.setValue(fieldName, value);
      });
    }
  }, [isLoadingSettings, settings.rememberChoices]);

  useEffect(() => {
    if (
      !isLoadingAnnotation &&
      isAnnotationReady &&
      !isLoadingSettings &&
      !pendingAnnotation
    ) {
      navigate("/annotations", { replace: true });
    }
  }, [
    isLoadingAnnotation,
    isAnnotationReady,
    isLoadingSettings,
    pendingAnnotation,
    navigate,
  ]);

  const handleCancel = async () => {
    try {
      await clearPendingAnnotation();
      const tabs = await browser.tabs.query({
        active: true,
        currentWindow: true,
      });
      if (tabs[0]?.id) {
        await sendMessage("removeTemporaryHighlight", undefined, tabs[0].id);
      }
    } catch (error) {
      console.error("Failed to cleanup on cancel:", error);
    }
    navigate("/annotations");
  };

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

    if (!pendingAnnotation) {
      setErrorMessages([
        "No annotation data available. Please select text and try again.",
      ]);
      return;
    }

    try {
      const payload: Record<string, any> = {
        ...data,
        submitter: oauth.identity_provider_identity,
        target: pendingAnnotation.target,
      };

      // Route through background service worker to bypass CORS/Brave Shields
      const result = await sendMessage("createAnnotation", { payload });

      if (!result.success) {
        throw new Error(result.error || "Failed to create annotation");
      }

      console.log("Annotation created successfully:", result.data);

      await clearPendingAnnotation();

      const tabs = await browser.tabs.query({
        active: true,
        currentWindow: true,
      });
      if (tabs[0]?.id) {
        await sendMessage("removeTemporaryHighlight", undefined, tabs[0].id);
        await sendMessage("reloadAnnotations", undefined, tabs[0].id);
      }

      if (data.rememberChoices === true && settings.rememberChoices) {
        const fieldsToReset = (AnnotationFormSchema as AnnotationSchema).fields
          .filter((field) => field.type !== "combobox")
          .map((field) => field.name);

        fieldsToReset.forEach((fieldName) => {
          formRef.current?.setValue(fieldName, "");
        });
        formRef.current?.setValue("selectedText", "");
      } else {
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

  if (isLoadingAnnotation || !isAnnotationReady || isLoadingSettings) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[200px] mx-2 my-12">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-300 border-t-rda-500"></div>
        <p className="mt-4 text-gray-600">Loading...</p>
      </div>
    );
  }

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

  if (!pendingAnnotation) {
    return null;
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

  const formDefaultValues = {
    selectedText: getSelectedTextFromTarget(pendingAnnotation.target),
    resource: pendingAnnotation.target.source,
    ...(settings.rememberChoices || {}),
  };

  return (
    <>
      {errorMessages.length > 0 && (
        <Alert title="Error Creating Annotation" messages={errorMessages} />
      )}
      <h2 className="text-xl mx-2 mt-6">Create Annotation</h2>
      <Form
        ref={formRef}
        onSubmit={handleSubmit}
        defaultValues={formDefaultValues}
      >
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

        <div className="flex flex-col gap-2 mx-2 mb-8">
          <button
            type="submit"
            className="mt-4 rounded-md w-full bg-rda-500 px-2.5 py-1.5 text-sm font-semibold text-white shadow-xs hover:bg-rda-400 focus-visible:outline-2 cursor-pointer focus-visible:outline-offset-2 focus-visible:outline-rda-500"
          >
            Create Annotation
          </button>
          <button
            type="button"
            onClick={handleCancel}
            className="rounded-md w-full bg-white border border-gray-300 px-2.5 py-1.5 text-sm font-semibold text-gray-700 shadow-xs hover:bg-gray-50 focus-visible:outline-2 cursor-pointer focus-visible:outline-offset-2 focus-visible:outline-gray-500"
          >
            Cancel
          </button>
        </div>
      </Form>
    </>
  );
}
