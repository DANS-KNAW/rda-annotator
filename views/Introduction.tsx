import { useState, useEffect } from "react";
import { storage } from "#imports";
import Button from "@/components/Button";
import FAQ from "@/components/FAQ";
import { useNavigate } from "react-router";

export default function Introduction() {
  const [seenIntro, setSeenIntro] = useState(false);
  let navigate = useNavigate();

  useEffect(() => {
    (async () => {
      const shown = await storage.getItem<boolean>("local:intro-shown");
      setSeenIntro(!!shown);
    })();
  }, [seenIntro]);

  const handleStart = async () => {
    await storage.setItem("local:intro-shown", true);
    setSeenIntro(true);
    navigate("/annotations");
  };

  return (
    <>
      <p className="mx-2 text-sm mt-4">
        This annotation tool is requested by the Research Data Alliance (RDA)
        and developed by Data Archiving and Networked Services (DANS) of the
        Royal Netherlands Academy of Arts and Sciences (KNAW).
      </p>

      <FAQ />

      {!seenIntro && (
        <div className="mx-2">
          <Button
            onClick={handleStart}
            label="Start Annotating"
            className="w-full"
          />
        </div>
      )}
    </>
  );
}
