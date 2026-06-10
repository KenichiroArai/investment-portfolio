"use client";

import { formatAsOfDateJa } from "@/lib/format-yen";

type ManageAsOfDateFieldProps =
  | {
      mode: "editable";
      value: string;
      onChange: (value: string) => void;
      disabled?: boolean;
    }
  | {
      mode: "readonly";
      value: string;
    };

const HELP_TEXT =
  "登録・更新・削除の対象となるスナップショットの日付です。閲覧画面の基準日切り替えとは別です。";

export function ManageAsOfDateField(props: ManageAsOfDateFieldProps) {
  let result = (
    <div className="manage-as-of-date">
      {props.mode === "editable" ? (
        <label>
          操作対象の基準日
          <input
            type="date"
            value={props.value}
            disabled={props.disabled}
            onChange={(event) => {
              props.onChange(event.target.value);
            }}
            required
          />
        </label>
      ) : (
        <p className="manage-as-of-date__value">
          <span className="manage-as-of-date__label">操作対象の基準日</span>
          <span>{formatAsOfDateJa(props.value)}</span>
        </p>
      )}
      <p className="manage-as-of-date__help">{HELP_TEXT}</p>
    </div>
  );
  return result;
}
