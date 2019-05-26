const departments = {
    "College Of Medicine": [ 
        "Medicine And Surgery",	"Dentistry", "Physiotherapy", "Biochemistry", "Physiology", "Human Nutrition", "Nursing Science"
    ],
    Pharmacy: ["Pharmacy"],
    "Agriculture And Forestry": ["Agriculture And forestry", "Agriculture", "Fisheries And Wildlife Management", "Forestry Resources Management"],
    Arts: [
        "Arabic Language And Literature", "Islamic Studies", "Archaeology", "Anthropology", 
        "Classics", "Religious Studies", "Communication and Language Arts", "Linguistics and African Studies",
        "History", "English Language and Literature", "Philosophy", "European Studies", "Theatre Arts"
    ],
    Law: ["Law"],
    "Veterinary Medicine": ["Veterinary Medicine"],
    Technology: [ "Agricultural And Environmental Engineering", "Civil Engineering", "Industrial Production Engineering", "Petroleum Engineering",
    "Electrical And Electronics Engineering", "Mechanical Engineering", "Food Technology", "Wood Products Engineering"
    ],
    Education: ["Adult Education", "Educational Management", "Teacher Education", "Special Education", "Human Kinetics",
    "Health Education", "Guidance And Counselling", "Library Studies" ],
    "Social Science": [ "Economics", "Geography", "Political Science", "Psychology", "Sociology" ],
    Science: [
        "Archaeology", "Anthropology", "Chemistry", "Industrial Chemistry", "Geography", "Computer Science", "Geology",
        "Mathematics", "Physics", "Statistics", "Zoology", "Botany", "Microbiology"
    ]
}

const allDepartments = []

for(key in departments) {
    departments[key].forEach(dep => {
        allDepartments.push( [dep, key])
    } )
}

const sortedDepartments = allDepartments.sort((a, b) => {
    if(a[0].toLowerCase() < b[0].toLowerCase() ) {
        return -1
    } else if(a[0].toLowerCase() > b[0].toLowerCase() ) {
        return 1
    } else {
        return 0
    }
})

const facDept = ( department ) => {
    const foundDepData =  sortedDepartments.filter(dep => dep[0].toLowerCase() === department.split("-")[0].toLowerCase() )
    console.log(foundDepData)
    let dept
    let faculty
    if(foundDepData.length === 1) {
        dept = foundDepData[0][0]
        faculty = foundDepData[0][1]
      } else {
        dept = department.split("-")[0]
        faculty = department.split("-")[1]
      }
      return [faculty, dept]
}



exports.facDept = facDept