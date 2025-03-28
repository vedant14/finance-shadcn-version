import axios from "axios";
import { useState } from "react";
import { useRevalidator } from "react-router";
import { Button } from "~/components/ui/button";
import {
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { useAuthStore, useDialogStore } from "~/utils/store";

export function SourceForm() {
  const formLayout = [
    {
      fields: [
        { id: "sourceName", label: "Source Name", type: "text" },
        {
          id: "sourceType",
          label: "Source Type",
          type: "select",
          options: ["MAIL", "API"],
        },
      ],
    },
    {
      fields: [
        {
          id: "defaultType",
          label: "Income or Expense",
          type: "select",
          options: ["EXPENSE", "INCOME"],
        },
        {
          id: "defaultCategory",
          label: "Default category for this expense/income",
          type: "select",
          options: [
            "FOOD_AND_DRINKS",
            "SHOPPING",
            "GROOMING",
            "HEALTH",
            "INVESTMENT",
            "TRAVEL",
            "ENTERTAINMENT",
            "OTHERS",
            "GROCERIES",
            "FUEL",
            "BILLS",
            "LEARNING",
            "LEND_SPLITWISE",
            "REFUND",
            "SALARY",
            "REDEEM",
            "SELF_TRANSFER",
            "SIDE_INCOME",
            "CREDIT_CARD_BILL",
            "JUNK",
          ],
        },
      ],
    },
    {
      fields: [
        { id: "subject", label: "Subject (for email)", type: "text" },
        { id: "label", label: "Label (for email)", type: "text" },
      ],
    },
    {
      fields: [
        { id: "fromEmail", label: "From Email (for email)", type: "text" },
      ],
    },
    {
      fields: [
        { id: "amountRegex", label: "Amount Regex", type: "text" },
        { id: "amountRegexBackup", label: "Amount Regex Backup", type: "text" },
      ],
    },
    {
      fields: [
        { id: "payeeRegex", label: "Payee Regex", type: "text" },
        { id: "payeeRegexBackup", label: "Payee Regex Backup", type: "text" },
      ],
    },
  ];
  const toggleOpen = useDialogStore((state) => state.toggleOpen);
  const user = useAuthStore((state) => state.user);
  const revalidator = useRevalidator();
  const [formData, setFormData] = useState(() => {
    const initialState = {};
    formLayout.forEach((row) => {
      row.fields.forEach((field) => {
        initialState[field.id] =
          field.type === "select" ? field.options[0] : ""; // Default to first option for select
      });
    });
    return initialState;
  });

  const handleChange = (id, value) => {
    setFormData((prev) => ({ ...prev, [id]: value }));
  };

  const handleFormSubmit = () => {
    axios
      .post("/api/create-source", {
        headers: {
          "Content-Type": "application/json",
          Authorization: user.idToken,
        },
        data: formData,
      })
      .then(function (response) {
        toggleOpen();
        setFormData(() => {
          return formLayout.reduce((acc, row) => {
            row.fields.forEach((field) => {
              acc[field.id] = field.type === "select" ? field.options[0] : "";
            });
            return acc;
          }, {});
        });
        revalidator.revalidate();
      })
      .catch(function (error) {
        console.log(error);
      });
  };

  return (
    <DialogContent className="!w-[800px]">
      <DialogHeader>
        <DialogTitle>Create a new source</DialogTitle>
        <DialogDescription>
          Criteria for adding a new transaction
        </DialogDescription>
      </DialogHeader>
      <div className="grid gap-4 py-4">
        {formLayout.map((row, rowIndex) => (
          <div key={rowIndex} className="grid grid-cols-2 gap-4">
            {row.fields.map((field) => (
              <div
                key={field.id}
                className="grid grid-cols-5 items-center gap-4"
              >
                <Label htmlFor={field.id} className="text-left col-span-2">
                  {field.label}
                </Label>

                {field.type === "select" ? (
                  <select
                    id={field.id}
                    value={formData[field.id]}
                    onChange={(e) => handleChange(field.id, e.target.value)}
                    className="col-span-3 border border-gray-300 rounded p-2"
                  >
                    {field.options.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                ) : (
                  <Input
                    id={field.id}
                    type={field.type}
                    value={formData[field.id]}
                    onChange={(e) => handleChange(field.id, e.target.value)}
                    className="col-span-3"
                  />
                )}
              </div>
            ))}
          </div>
        ))}
      </div>
      <DialogFooter>
        <Button type="submit" onClick={() => handleFormSubmit()}>
          Create Source
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
