Feature: gulp-sub test suite

    Scenario: Loading gulp-sub
        Given I have loaded component "gulp-sub" with use case "dataDriven"
        Then the element "dummy" should have the text "TODO gulp-sub contents here."
