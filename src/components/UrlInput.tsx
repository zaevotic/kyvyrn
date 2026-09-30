interface UrlInputProps {
  value: string
  onChange: (value: string) => void
}

function UrlInput({ value, onChange }: UrlInputProps) {
  return (
    <div className="mb-4">
      <label htmlFor="url" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
        Enter Website URL
      </label>
      <input
        type="url"
        id="url"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="https://example.com"
        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
      />
    </div>
  )
}

export default UrlInput