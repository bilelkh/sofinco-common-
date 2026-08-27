import styles from "./Search.module.css";

export type InputProps = {
  action?: string | ((formData: FormData) => void | Promise<void>);
  placeholder: string;
  query: string;
  inputRef: React.RefObject<HTMLInputElement | null>;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onClick?: (e: React.MouseEvent<HTMLInputElement>) => void;
  onFocus?: (e: React.FocusEvent<HTMLInputElement>) => void;
};

const Input = ({
  action,
  placeholder,
  query,
  inputRef,
  onSubmit,
  onChange,
  onClick,
  onFocus,
}: InputProps) => {
  return (
    <form
      method="get"
      action={action}
      className={styles["search__form"]}
      onSubmit={onSubmit}
    >
      <svg
        className={styles["search__icon"]}
        width={15}
        height={15}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <circle cx={11} cy={11} r={8} />
        <path d="m21 21-4.3-4.3" />
      </svg>
      <input
        ref={inputRef}
        type="text"
        name="query"
        placeholder={placeholder}
        className={styles["search__input"]}
        autoComplete="off"
        aria-label={placeholder}
        value={query}
        onChange={onChange}
        onFocus={onFocus}
        onClick={onClick}
      />
      <button type="submit" className={styles["sr-only"]} tabIndex={-1}>
        {placeholder}
      </button>
    </form>
  );
};

export default Input;
